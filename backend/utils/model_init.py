"""
Model Initialization Utility
Creates and saves a mock/demo ML model for testing if no trained model exists
In production, replace this with your actual trained model
"""

import os
import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler


def create_mock_model(output_path: str):
    """
    Create a mock Random Forest model for testing purposes.
    In production, you would load your actual trained model.
    
    Args:
        output_path: Path where to save the model (.pkl file)
    """
    print("🔧 Creating mock ML model for testing...")
    
    # Create dummy training data
    # In reality, this would be your actual training dataset
    np.random.seed(42)
    
    # 70 samples, 70 features (matching our feature extraction)
    X_train = np.random.randn(70, 70)
    y_train = np.random.randint(0, 4, 70)  # 4 damage classes
    
    # Train simple Random Forest
    model = RandomForestClassifier(
        n_estimators=10,
        max_depth=5,
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train, y_train)
    
    # Create and fit scaler
    scaler = StandardScaler()
    scaler.fit(X_train)
    
    # Save model
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    joblib.dump(model, output_path)
    
    # Save scaler too
    scaler_path = output_path.replace('.pkl', '_scaler.pkl')
    joblib.dump(scaler, scaler_path)
    
    print(f"✓ Mock model created: {output_path}")
    print(f"✓ Scaler created: {scaler_path}")
    
    return model, scaler


def load_or_create_model(model_path: str):
    """
    Load model if exists, otherwise create a mock model
    
    Args:
        model_path: Path to model file
        
    Returns:
        tuple: (model, scaler)
    """
    if os.path.exists(model_path):
        print(f"✓ Loading existing model: {model_path}")
        model = joblib.load(model_path)
        
        scaler_path = model_path.replace('.pkl', '_scaler.pkl')
        if os.path.exists(scaler_path):
            scaler = joblib.load(scaler_path)
        else:
            scaler = None
        
        return model, scaler
    else:
        print(f"⚠ Model not found: {model_path}")
        print("📌 Creating mock model for testing. Replace with your trained model in production!")
        return create_mock_model(model_path)


if __name__ == "__main__":
    # Test model creation
    model_path = os.path.join(
        os.path.dirname(__file__), 
        '../models/damage_classifier.pkl'
    )
    load_or_create_model(model_path)
