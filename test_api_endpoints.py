import pytest
from fastapi.testclient import TestClient
from test_forecast import app

client = TestClient(app)

def test_root_endpoint():
    """Test the root endpoint returns the expected response"""
    response = client.get("/")
    assert response.status_code == 200
    assert "message" in response.json()
    assert "endpoints" in response.json()

def test_usage_trends_endpoint():
    """Test the usage trends endpoint returns the expected structure"""
    response = client.get("/analytics/usage-trends")
    assert response.status_code == 200
    # Check that the response has the expected keys
    data = response.json()
    assert "daily_usage" in data
    assert "total_usage_percent" in data
    assert "days_analyzed" in data
    # Check that daily_usage is a dictionary
    assert isinstance(data["daily_usage"], dict)
    # Check that days_analyzed is a number
    assert isinstance(data["days_analyzed"], int)

def test_alert_history_endpoint():
    """Test the alert history endpoint returns the expected structure"""
    response = client.get("/dashboard/alert-history")
    assert response.status_code == 200
    # Check that the response is a list
    data = response.json()
    assert isinstance(data, list)
    # If there are alerts, check their structure
    if data:
        alert = data[0]
        assert "date" in alert
        assert "usage_percentage" in alert
        assert "message" in alert

def test_cost_projection_endpoint():
    """Test the cost projection endpoint returns the expected structure"""
    response = client.get("/dashboard/cost-projection")
    assert response.status_code == 200
    # Check that the response has the expected keys
    data = response.json()
    assert "plan_cost" in data
    assert "current_value" in data
    assert "projected_cost" in data
    assert "projected_date" in data
    assert "projected_percentage" in data
    # Check that the values are the correct types
    assert isinstance(data["plan_cost"], (int, float))
    assert isinstance(data["current_value"], (int, float))
    assert isinstance(data["projected_percentage"], (int, float))

def test_auth_login_endpoint():
    """Test the authentication login endpoint"""
    # Test with valid credentials
    response = client.post(
        "/auth/login",
        json={"email": "marketer@example.com", "password": "password123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "token_type" in data
    assert "expires_at" in data
    assert "user" in data
    assert data["token_type"] == "bearer"
    
    # Test with invalid credentials
    response = client.post(
        "/auth/login",
        json={"email": "wrong@example.com", "password": "wrongpassword"}
    )
    assert response.status_code == 401  # Unauthorized
    
    # Test with incomplete data
    response = client.post(
        "/auth/login",
        json={"email": "marketer@example.com"}  # Missing password
    )
    assert response.status_code == 422  # Unprocessable Entity

if __name__ == "__main__":
    # Run tests manually if needed
    test_root_endpoint()
    test_usage_trends_endpoint()
    test_alert_history_endpoint()
    test_cost_projection_endpoint()
    test_auth_login_endpoint()
    print("All tests passed!") 