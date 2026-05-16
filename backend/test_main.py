import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "ML Visual Explorer API running"


def test_list_datasets():
    response = client.get("/api/datasets")
    assert response.status_code == 200
    data = response.json()
    assert "datasets" in data
    assert len(data["datasets"]) == 4


def test_linear_regression_default():
    response = client.post("/api/linear-regression", json={})
    assert response.status_code == 200
    data = response.json()
    assert "scatter" in data
    assert "line" in data
    assert "metrics" in data
    assert "model_info" in data


def test_linear_regression_polynomial():
    payload = {"model_type": "polynomial", "degree": 3}
    response = client.post("/api/linear-regression", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["model_info"]["model_type"] == "polynomial"


def test_logistic_regression():
    response = client.post("/api/logistic-regression", json={"dataset": "moons"})
    assert response.status_code == 200
    data = response.json()
    assert "scatter" in data
    assert "boundary" in data
    assert "metrics" in data


def test_knn():
    response = client.post("/api/knn", json={"n_neighbors": 5})
    assert response.status_code == 200
    data = response.json()
    assert "scatter" in data
    assert "boundary" in data


def test_svm():
    response = client.post("/api/svm", json={"kernel": "rbf", "C": 1.0})
    assert response.status_code == 200
    data = response.json()
    assert "scatter" in data
    assert data["model_info"]["kernel"] == "rbf"


def test_decision_tree():
    response = client.post("/api/decision-tree", json={"max_depth": 3})
    assert response.status_code == 200
    data = response.json()
    assert "scatter" in data
    assert data["model_info"]["max_depth"] == 3


def test_random_forest():
    response = client.post("/api/random-forest", json={"n_estimators": 10})
    assert response.status_code == 200
    data = response.json()
    assert "scatter" in data
    assert data["model_info"]["n_estimators"] == 10


def test_bias_variance_decision_tree():
    response = client.post("/api/bias-variance", json={"model_type": "decision_tree"})
    assert response.status_code == 200
    data = response.json()
    assert "points" in data
    assert len(data["points"]) == 20


def test_bias_variance_knn():
    response = client.post("/api/bias-variance", json={"model_type": "knn"})
    assert response.status_code == 200
    data = response.json()
    assert "points" in data
    assert len(data["points"]) == 30


def test_compare():
    payload = {"model_a": "logistic", "model_b": "svm"}
    response = client.post("/api/compare", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "a" in data
    assert "b" in data
    assert data["a"]["model_type"] == "logistic"
    assert data["b"]["model_type"] == "svm"


def test_gradient_boosting():
    response = client.post("/api/gradient-boosting", json={"n_estimators": 50})
    assert response.status_code == 200
    data = response.json()
    assert "scatter" in data
    assert data["model_info"]["n_estimators"] == 50


def test_naive_bayes():
    response = client.post("/api/naive-bayes", json={"dataset": "blobs"})
    assert response.status_code == 200
    data = response.json()
    assert "scatter" in data
    assert "class_stats" in data["model_info"]


def test_neural_net():
    response = client.post("/api/neural-net", json={"hidden_layers": 2, "neurons_per_layer": 16})
    assert response.status_code == 200
    data = response.json()
    assert "scatter" in data
    assert data["model_info"]["hidden_layers"] == 2
