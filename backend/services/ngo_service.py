"""
NGO Linking Service - Handles automatic NGO assignment to disaster events
Based on location proximity and damage severity
"""

import json
import os
import math
from typing import Dict, List, Optional, Tuple
from models.damage_model import db, NGOList, AnalysisResult


class NGOLinkingService:
    """
    Service for automatically linking appropriate NGOs to disaster events.
    Considers location proximity and disaster severity.
    """
    
    def __init__(self, ngo_data_path: str = None):
        """
        Initialize NGO Linking Service
        
        Args:
            ngo_data_path: Path to NGO dataset JSON file
        """
        self.ngo_data_path = ngo_data_path or os.path.join(
            os.path.dirname(__file__), '../data/ngo_dataset.json'
        )
        self.ngos = []
    
    def load_ngo_data(self) -> bool:
        """
        Load NGO data from JSON file into database.
        Checks if NGOs already exist to avoid duplicates.
        """
        try:
            self.ngos = []
            if not os.path.exists(self.ngo_data_path):
                print(f"✗ NGO data file not found: {self.ngo_data_path}")
                return False
            
            with open(self.ngo_data_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Save to database if not already present
            for ngo_data in data.get('ngos', []):
                existing = NGOList.query.filter_by(name=ngo_data['name']).first()
                if not existing:
                    ngo = NGOList(
                        name=ngo_data['name'],
                        description=ngo_data.get('description'),
                        latitude=ngo_data['latitude'],
                        longitude=ngo_data['longitude'],
                        contact_email=ngo_data.get('contact_email'),
                        contact_phone=ngo_data.get('contact_phone'),
                        specialization=ngo_data.get('specialization'),
                        service_radius_km=ngo_data.get('service_radius_km', 50),
                        active=ngo_data.get('active', True)
                    )
                    db.session.add(ngo)
                self.ngos.append(ngo_data)
            
            db.session.commit()
            print(f"✓ Loaded {len(self.ngos)} NGOs")
            return True
            
        except Exception as e:
            print(f"✗ Error loading NGO data: {str(e)}")
            db.session.rollback()
            return False
    
    @staticmethod
    def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calculate distance between two geographical points using Haversine formula
        
        Args:
            lat1, lon1: Disaster location
            lat2, lon2: NGO location
            
        Returns:
            Distance in kilometers
        """
        R = 6371  # Earth's radius in km
        
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lon = math.radians(lon2 - lon1)
        
        a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        
        return R * c
    
    def find_nearest_ngo(self, latitude: float, longitude: float, 
                        damage_percentage: float = 0) -> Optional[NGOList]:
        """
        Find the nearest active NGO for a given disaster location.
        Considers location proximity and service radius.
        
        Args:
            latitude: Disaster latitude
            longitude: Disaster longitude  
            damage_percentage: Damage severity (0-100)
            
        Returns:
            NGOList object or None if no NGO found
        """
        try:
            # Get all active NGOs
            active_ngos = NGOList.query.filter_by(active=True).all()
            
            if not active_ngos:
                print("⚠ No active NGOs found in database")
                return None
            
            # Calculate distances and filter by service radius
            candidates = []
            for ngo in active_ngos:
                distance = self.calculate_distance(
                    latitude, longitude,
                    ngo.latitude, ngo.longitude
                )
                
                # Check if within service radius
                if distance <= ngo.service_radius_km:
                    candidates.append({
                        'ngo': ngo,
                        'distance': distance,
                        'score': self._calculate_priority_score(ngo, distance, damage_percentage)
                    })
            
            if not candidates:
                print(f"⚠ No NGOs within service radius for location ({latitude}, {longitude})")
                return None
            
            # Sort by priority score (lower is better)
            candidates.sort(key=lambda x: x['score'])
            
            selected_ngo = candidates[0]['ngo']
            print(f"✓ Selected NGO: {selected_ngo.name} (Distance: {candidates[0]['distance']:.2f} km)")
            
            return selected_ngo
            
        except Exception as e:
            print(f"✗ Error finding nearest NGO: {str(e)}")
            return None
    
    @staticmethod
    def _calculate_priority_score(ngo: NGOList, distance: float, damage_percentage: float) -> float:
        """
        Calculate priority score for NGO selection.
        Lower score = higher priority.
        Considers: distance, damage severity, specialization.
        
        Args:
            ngo: NGO object
            distance: Distance from disaster location in km
            damage_percentage: Damage severity (0-100)
            
        Returns:
            float: Priority score
        """
        # Base score from distance (normalized)
        distance_score = distance / 100.0  # Normalize to 0-1
        
        # Damage severity factor (higher damage = higher priority)
        damage_factor = 1.0 - (damage_percentage / 100.0) if damage_percentage < 60 else 0.5
        
        # Service radius factor (NGOs with larger radius get slight preference)
        radius_factor = max(0, 1.0 - (ngo.service_radius_km / 200.0))
        
        # Combined score
        final_score = (distance_score * 0.6) + (damage_factor * 0.3) + (radius_factor * 0.1)
        
        return final_score
    
    def assign_ngo_to_disaster(self, analysis_result: AnalysisResult) -> Dict:
        """
        Assign an NGO to a disaster event and update the analysis record.
        
        Args:
            analysis_result: AnalysisResult database object
            
        Returns:
            Dict with assignment details
        """
        try:
            if analysis_result.latitude is None or analysis_result.longitude is None:
                return {
                    "success": False,
                    "message": "Location coordinates not provided",
                    "assigned_ngo": None
                }
            
            # Find nearest NGO
            selected_ngo = self.find_nearest_ngo(
                analysis_result.latitude,
                analysis_result.longitude,
                analysis_result.damage_percentage
            )
            
            if not selected_ngo:
                return {
                    "success": False,
                    "message": "No NGO found within service area",
                    "assigned_ngo": None
                }
            
            # Update analysis result
            analysis_result.assigned_ngo_id = selected_ngo.id
            
            # Set alert flag if damage is severe
            if analysis_result.damage_percentage > 60:
                analysis_result.alert_sent = True
            
            db.session.commit()
            
            return {
                "success": True,
                "message": f"NGO '{selected_ngo.name}' assigned successfully",
                "assigned_ngo": selected_ngo.to_dict(),
                "alert_sent": analysis_result.alert_sent
            }
            
        except Exception as e:
            db.session.rollback()
            print(f"✗ Error assigning NGO: {str(e)}")
            return {
                "success": False,
                "message": f"Error: {str(e)}",
                "assigned_ngo": None
            }
    
    def get_all_ngos(self) -> List[Dict]:
        """
        Get all active NGOs
        
        Returns:
            List of NGO dictionaries
        """
        ngos = NGOList.query.filter_by(active=True).all()
        return [ngo.to_dict() for ngo in ngos]
    
    def get_nearby_ngos(self, latitude: float, longitude: float, 
                       radius_km: float = 100) -> List[Dict]:
        """
        Get all NGOs within a specified radius of a location
        
        Args:
            latitude: Center latitude
            longitude: Center longitude
            radius_km: Search radius in kilometers
            
        Returns:
            List of nearby NGO dictionaries
        """
        active_ngos = NGOList.query.filter_by(active=True).all()
        nearby = []
        
        for ngo in active_ngos:
            distance = self.calculate_distance(latitude, longitude, ngo.latitude, ngo.longitude)
            if distance <= radius_km:
                ngo_dict = ngo.to_dict()
                ngo_dict['distance_km'] = round(distance, 2)
                nearby.append(ngo_dict)
        
        # Sort by distance
        nearby.sort(key=lambda x: x['distance_km'])
        return nearby


# Singleton instance
_ngo_service = None

def get_ngo_service() -> NGOLinkingService:
    """Get or create NGO Linking Service instance"""
    global _ngo_service
    if _ngo_service is None:
        _ngo_service = NGOLinkingService()
    return _ngo_service
