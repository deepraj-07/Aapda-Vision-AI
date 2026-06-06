"""
ML Pipeline Service - Handles all machine learning operations
Including: model loading, predictions, SHAP explainability, and feature importance
"""

import os
import io
import numpy as np
import joblib
from collections import deque
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns
from typing import Dict, List, Tuple, Any
from datetime import datetime
import base64
try:
    import shap
except Exception:
    shap = None
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import GridSearchCV
from sklearn.metrics import confusion_matrix, classification_report
import cv2
from PIL import Image


class MLPipeline:
    """
    Comprehensive ML Pipeline for damage classification and prediction.
    Handles model training, prediction, and explainability using SHAP.
    """
    
    def __init__(self, model_path: str = None):
        """
        Initialize ML Pipeline
        
        Args:
            model_path: Path to trained model (.pkl file)
        """
        self.model = None
        self.scaler = None
        self.feature_names = None
        self.model_path = model_path
        self.explainer = None
        self.X_train = None
        self.y_train = None
        self.feature_buffer = deque(maxlen=128)
        
        # Damage classification labels
        self.damage_classes = {
            0: "No Damage",
            1: "Minor Damage",
            2: "Major Damage", 
            3: "Destroyed"
        }
        
        if model_path and os.path.exists(model_path):
            self.load_model(model_path)
    
    def load_model(self, model_path: str) -> bool:
        """
        Load pre-trained model from .pkl file
        
        Args:
            model_path: Path to pkl file
            
        Returns:
            bool: True if successful
        """
        try:
            self.model = joblib.load(model_path)
            self.model_path = model_path
            scaler_path = model_path.replace('.pkl', '_scaler.pkl')
            if os.path.exists(scaler_path):
                self.scaler = joblib.load(scaler_path)
            print(f"✓ Model loaded successfully from {model_path}")
            return True
        except Exception as e:
            print(f"✗ Error loading model: {str(e)}")
            return False
    
    def extract_features_from_image(self, image_array: np.ndarray) -> np.ndarray:
        """
        Extract numerical features from image for ML model
        Includes: Color statistics, texture features, edge detection
        
        Args:
            image_array: Input image as numpy array (RGB)
            
        Returns:
            np.ndarray: Feature vector
        """
        features = []
        
        # 1. Color statistics (mean, std, min, max for each channel)
        for channel in range(3):
            channel_data = image_array[:,:,channel].flatten()
            features.extend([
                np.mean(channel_data),
                np.std(channel_data),
                np.min(channel_data),
                np.max(channel_data)
            ])
        
        # 2. Grayscale statistics
        gray = cv2.cvtColor(image_array, cv2.COLOR_RGB2GRAY)
        features.extend([
            np.mean(gray),
            np.std(gray),
            np.percentile(gray, 25),
            np.percentile(gray, 75)
        ])
        
        # 3. Edge detection (Canny)
        edges = cv2.Canny(gray, 50, 150)
        features.extend([
            np.sum(edges) / (gray.shape[0] * gray.shape[1]),  # Edge density
            np.std(edges) / 255.0
        ])
        
        # 4. Texture features (histogram)
        hist = cv2.calcHist([gray], [0], None, [32], [0, 256])
        hist = hist.flatten() / np.sum(hist)
        features.extend(hist.tolist())
        
        # 5. Structural similarity
        # Local variance in blocks
        block_size = 32
        h, w = gray.shape
        local_vars = []
        for i in range(0, h - block_size, block_size):
            for j in range(0, w - block_size, block_size):
                block = gray[i:i+block_size, j:j+block_size]
                local_vars.append(np.var(block))
        
        if local_vars:
            features.extend([
                np.mean(local_vars),
                np.std(local_vars),
                np.max(local_vars)
            ])
        
        feature_vector = np.array(features, dtype=np.float32)

        # Keep feature size stable for trained models/scalers expecting 70 features.
        target_dim = 70
        if feature_vector.shape[0] < target_dim:
            feature_vector = np.pad(feature_vector, (0, target_dim - feature_vector.shape[0]), mode="constant")
        elif feature_vector.shape[0] > target_dim:
            feature_vector = feature_vector[:target_dim]

        return feature_vector.reshape(1, -1)
    
    def predict(self, image_array: np.ndarray) -> Dict[str, Any]:
        """
        Make prediction on input image
        
        Args:
            image_array: Input image as numpy array (RGB)
            
        Returns:
            Dict with damage_class, damage_percent, confidence_score
        """
        if self.model is None:
            return {
                "error": "Model not loaded",
                "damage_class": "Unknown",
                "damage_percent": 0,
                "confidence_score": 0
            }
        
        try:
            # Extract features
            features = self.extract_features_from_image(image_array)
            self.feature_buffer.append(features[0])
            
            # Scale features if scaler is available
            if self.scaler:
                features_scaled = self.scaler.transform(features)
            else:
                features_scaled = features
            
            # Make prediction
            if hasattr(self.model, 'predict_proba'):
                probabilities = self.model.predict_proba(features_scaled)[0]
                prediction = np.argmax(probabilities)
                confidence = float(np.max(probabilities))
            else:
                prediction = int(self.model.predict(features_scaled)[0])
                confidence = 0.85  # Default confidence
            
            # Convert prediction to damage percentage (0-100)
            damage_percent = (prediction / (len(self.damage_classes) - 1)) * 100
            
            return {
                "damage_class": self.damage_classes.get(prediction, "Unknown"),
                "damage_percent": round(damage_percent, 2),
                "confidence_score": round(confidence, 4),
                "prediction_label": prediction
            }
            
        except Exception as e:
            print(f"✗ Prediction error: {str(e)}")
            return {
                "error": str(e),
                "damage_class": "Unknown",
                "damage_percent": 0,
                "confidence_score": 0
            }
    
    def generate_shap_explanation(self, image_array: np.ndarray, output_path: str = None) -> Dict[str, Any]:
        """
        Generate SHAP explanation plot for model prediction
        Shows which features contributed most to the prediction
        
        Args:
            image_array: Input image as numpy array
            output_path: Optional path to save SHAP plot
            
        Returns:
            Dict with base64 encoded image and explanation text
        """
        if self.model is None or not hasattr(self.model, 'predict_proba'):
            return {
                "error": "Model not available for SHAP analysis",
                "explanation_image": None,
                "feature_importance": []
            }

        if shap is None:
            return {
                "error": "SHAP package is not installed",
                "explanation_image": None,
                "feature_importance": [],
            }
        
        try:
            features = self.extract_features_from_image(image_array)

            if self.scaler is not None:
                features_for_model = self.scaler.transform(features)
            else:
                features_for_model = features

            if len(self.feature_buffer) > 4:
                background = np.array(list(self.feature_buffer), dtype=np.float32)
                if background.shape[0] > 40:
                    background = shap.sample(background, 40, random_state=42)
            else:
                background = features_for_model

            if self.explainer is None:
                self.explainer = shap.TreeExplainer(self.model, data=background)

            shap_values = self.explainer.shap_values(features_for_model)
            if isinstance(shap_values, list):
                shap_vals = np.array(shap_values[0])
            else:
                shap_vals = np.array(shap_values)

            if shap_vals.ndim == 3:
                shap_row = shap_vals[0, :, 0]
            elif shap_vals.ndim == 2:
                shap_row = shap_vals[0]
            else:
                shap_row = shap_vals.ravel()

            top_idx = np.argsort(np.abs(shap_row))[-5:][::-1]
            top_features = []
            for idx in top_idx:
                top_features.append(
                    {
                        "feature_index": int(idx),
                        "importance": float(abs(shap_row[idx])),
                        "value": float(features_for_model[0][idx]),
                        "impact": "positive" if shap_row[idx] >= 0 else "negative",
                    }
                )

            plt.figure(figsize=(8, 4.5))
            importances = [f["importance"] for f in top_features]
            labels = [f"Feature {f['feature_index']}" for f in top_features]
            plt.barh(labels, importances, color="#2d7dd2")
            plt.xlabel("SHAP impact")
            plt.title("Top Features Contributing to Damage Prediction")
            plt.tight_layout()

            if output_path:
                plt.savefig(output_path, dpi=110, bbox_inches='tight')

            buffer = io.BytesIO()
            plt.savefig(buffer, format='png', dpi=110, bbox_inches='tight')
            buffer.seek(0)
            image_base64 = base64.b64encode(buffer.read()).decode()
            plt.close()

            return {
                "explanation_image": f"data:image/png;base64,{image_base64}",
                "feature_importance": top_features,
                "interpretation": "Top features with larger SHAP magnitude had the strongest influence.",
            }
            
        except Exception as e:
            print(f"✗ SHAP explanation error: {str(e)}")
            return {
                "error": str(e),
                "explanation_image": None,
                "feature_importance": []
            }
    
    def generate_confusion_matrix(self, y_true: List, y_pred: List, output_path: str = None) -> Dict[str, Any]:
        """
        Generate confusion matrix heatmap
        
        Args:
            y_true: True labels
            y_pred: Predicted labels
            output_path: Path to save image
            
        Returns:
            Dict with base64 encoded image
        """
        try:
            cm = confusion_matrix(y_true, y_pred)
            
            plt.figure(figsize=(8, 6))
            sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', 
                       xticklabels=list(self.damage_classes.values()),
                       yticklabels=list(self.damage_classes.values()))
            plt.title('Confusion Matrix - Damage Classification')
            plt.ylabel('True Label')
            plt.xlabel('Predicted Label')
            plt.tight_layout()
            
            if output_path:
                plt.savefig(output_path, dpi=100, bbox_inches='tight')
            
            buffer = io.BytesIO()
            plt.savefig(buffer, format='png', dpi=100, bbox_inches='tight')
            buffer.seek(0)
            image_base64 = base64.b64encode(buffer.read()).decode()
            plt.close()
            
            return {
                "confusion_matrix_image": f"data:image/png;base64,{image_base64}",
                "matrix_data": cm.tolist()
            }
        except Exception as e:
            print(f"✗ Confusion matrix error: {str(e)}")
            return {"error": str(e)}
    
    def generate_feature_importance(self, output_path: str = None) -> Dict[str, Any]:
        """
        Generate feature importance plot if model supports it
        
        Args:
            output_path: Path to save image
            
        Returns:
            Dict with base64 encoded image
        """
        try:
            if not hasattr(self.model, 'feature_importances_'):
                return {"error": "Model does not support feature importance"}
            
            importances = self.model.feature_importances_
            indices = np.argsort(importances)[-10:][::-1]
            
            plt.figure(figsize=(10, 6))
            plt.title('Top 10 Feature Importance')
            plt.bar(range(10), importances[indices])
            plt.xlabel('Feature Index')
            plt.ylabel('Importance')
            plt.xticks(range(10), indices)
            plt.tight_layout()
            
            if output_path:
                plt.savefig(output_path, dpi=100, bbox_inches='tight')
            
            buffer = io.BytesIO()
            plt.savefig(buffer, format='png', dpi=100, bbox_inches='tight')
            buffer.seek(0)
            image_base64 = base64.b64encode(buffer.read()).decode()
            plt.close()
            
            return {
                "feature_importance_image": f"data:image/png;base64,{image_base64}",
                "top_features": indices.tolist(),
                "importance_values": [float(importances[i]) for i in indices]
            }
        except Exception as e:
            print(f"✗ Feature importance error: {str(e)}")
            return {"error": str(e)}
    
    def set_training_data(self, X_train: np.ndarray, y_train: np.ndarray, scaler: StandardScaler = None):
        """
        Set training data for SHAP explainer background
        
        Args:
            X_train: Training features
            y_train: Training labels
            scaler: Optional StandardScaler for feature scaling
        """
        self.X_train = X_train
        self.y_train = y_train
        self.scaler = scaler
        print(f"✓ Training data set: {X_train.shape[0]} samples, {X_train.shape[1]} features")


# Singleton instance
_ml_pipeline = None

def get_ml_pipeline(model_path: str = None) -> MLPipeline:
    """
    Get or create ML pipeline instance
    
    Args:
        model_path: Path to model file (only used on first call)
        
    Returns:
        MLPipeline instance
    """
    global _ml_pipeline
    if _ml_pipeline is None:
        _ml_pipeline = MLPipeline(model_path)
    return _ml_pipeline
