import os
from sqlalchemy import inspect, text

from dotenv import load_dotenv
from flask import Flask, send_from_directory
from flask_cors import CORS

from models.damage_model import db
from utils.model_init import load_or_create_model
from routes.predict import predict_bp
from routes.analyze import analyze_bp


def create_app() -> Flask:
    load_dotenv()
    app = Flask(__name__)
    backend_root = os.path.dirname(__file__)

    # Database config
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv(
        "DATABASE_URL", "sqlite:///aapda_vision_ai.db"
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # File upload limits
    app.config["MAX_CONTENT_LENGTH"] = 25 * 1024 * 1024

    # Upload + Output folders
    upload_folder = os.getenv("UPLOAD_FOLDER", "data/uploads")
    output_folder = os.getenv("OUTPUT_FOLDER", "data/outputs")

    app.config["UPLOAD_FOLDER"] = (
        upload_folder
        if os.path.isabs(upload_folder)
        else os.path.join(backend_root, upload_folder)
    )
    app.config["OUTPUT_FOLDER"] = (
        output_folder
        if os.path.isabs(output_folder)
        else os.path.join(backend_root, output_folder)
    )

    # Ensure folders exist
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
    os.makedirs(app.config["OUTPUT_FOLDER"], exist_ok=True)

    # Enable CORS
    CORS(app, resources={r"/*": {"origins": "*"}})

    # Initialize database
    db.init_app(app)

    # Register routes
    app.register_blueprint(predict_bp)
    app.register_blueprint(analyze_bp)

    with app.app_context():
        db.create_all()

        inspector = inspect(db.engine)
        if "analysis_results" in inspector.get_table_names():
            columns = {column["name"] for column in inspector.get_columns("analysis_results")}
            required_columns = {
                "detection_image_path": "VARCHAR(512)",
                "shap_image_path": "VARCHAR(512)",
                "damage_class": "VARCHAR(100)",
                "confidence_score": "FLOAT",
                "latitude": "FLOAT",
                "longitude": "FLOAT",
                "location_name": "VARCHAR(255)",
                "assigned_ngo_id": "INTEGER",
                "alert_sent": "BOOLEAN DEFAULT 0",
                "updated_at": "DATETIME",
            }

            for column_name, column_type in required_columns.items():
                if column_name not in columns:
                    db.session.execute(
                        text(f"ALTER TABLE analysis_results ADD COLUMN {column_name} {column_type}")
                    )
                    db.session.commit()

        # Initialize ML model
        model_path = os.path.join(os.path.dirname(__file__), "models", "damage_classifier.pkl")
        model, scaler = load_or_create_model(model_path)

        # Initialize ML pipeline with model
        from services.ml_pipeline import get_ml_pipeline

        ml_pipeline = get_ml_pipeline(model_path)
        ml_pipeline.model = model
        ml_pipeline.scaler = scaler
        print(f"[startup] Model loaded successfully from: {model_path}")

        # Initialize NGO service
        from services.ngo_service import get_ngo_service

        ngo_service = get_ngo_service()
        ngo_service.load_ngo_data()

    @app.post("/predict")
    def predict_alias():
        # Compatibility alias for clients that call /predict directly.
        from routes.predict import predict_damage

        return predict_damage()

    @app.post("/advanced-insights")
    def advanced_insights_alias():
        # Compatibility alias to ensure advanced insights is always reachable.
        from routes.analyze import advanced_insights

        return advanced_insights()

    # ---------------------------
    # HEALTH CHECK
    # ---------------------------
    @app.get("/health")
    def health():
        return {
            "status": "ok",
            "service": "AapdaVision AI Backend"
        }, 200

    # ---------------------------
    # ROOT ENDPOINT
    # ---------------------------
    @app.route("/")
    def home():
        return {
            "message": "AapdaVision AI Backend Running",
            "health": "/health",
            "analyze": "/analyze",
            "report": "/report"
        }

    # ---------------------------
    # SERVE GENERATED IMAGES
    # ---------------------------
    @app.route("/data/<path:filename>")
    def serve_data(filename):
        normalized = str(filename).replace("\\", "/").lstrip("/")

        # Serve from explicit runtime folders first.
        if normalized.startswith("uploads/"):
            target = normalized[len("uploads/") :]
            return send_from_directory(app.config["UPLOAD_FOLDER"], target)

        if normalized.startswith("outputs/"):
            target = normalized[len("outputs/") :]
            return send_from_directory(app.config["OUTPUT_FOLDER"], target)

        # Fallback for legacy relative storage paths.
        for root in (os.path.join(backend_root, "data"), os.path.join(os.getcwd(), "data")):
            candidate = os.path.join(root, normalized)
            if os.path.exists(candidate):
                return send_from_directory(root, normalized)

        return {"error": "File not found"}, 404

    return app


# ---------------------------
# RUN SERVER
# ---------------------------
if __name__ == "__main__":
    flask_app = create_app()

    flask_app.run(
        host="0.0.0.0",
        port=int(os.getenv("PORT", "5000")),
        debug=True
    )