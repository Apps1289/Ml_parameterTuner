from pydantic import BaseModel
from typing import Optional, List


class LinearRegressionRequest(BaseModel):
    dataset: str = "linear"
    n_samples: int = 80
    noise: float = 0.3
    test_size: float = 0.2
    seed: int = 42
    model_type: str = "linear"
    fit_intercept: bool = True
    degree: int = 2
    ridge_alpha: float = 1.0
    lasso_alpha: float = 0.1
    lasso_max_iter: int = 1000
    elastic_alpha: float = 0.1
    elastic_l1_ratio: float = 0.5


class LogisticRegressionRequest(BaseModel):
    dataset: str = "moons"
    n_samples: int = 200
    noise: float = 0.2
    test_size: float = 0.25
    seed: int = 42
    C: float = 1.0
    penalty: str = "l2"
    solver: str = "lbfgs"
    max_iter: int = 1000
    resolution: int = 80


class KNNRequest(BaseModel):
    dataset: str = "moons"
    n_samples: int = 200
    noise: float = 0.2
    test_size: float = 0.25
    seed: int = 42
    resolution: int = 80
    n_neighbors: int = 5
    metric: str = "euclidean"
    weights: str = "uniform"
    p: int = 2


class SVMRequest(BaseModel):
    dataset: str = "moons"
    n_samples: int = 200
    noise: float = 0.2
    test_size: float = 0.25
    seed: int = 42
    resolution: int = 80
    C: float = 1.0
    kernel: str = "rbf"
    gamma: float = 1.0
    degree: int = 3
    coef0: float = 0.0


class DecisionTreeRequest(BaseModel):
    dataset: str = "moons"
    n_samples: int = 200
    noise: float = 0.2
    test_size: float = 0.25
    seed: int = 42
    resolution: int = 80
    max_depth: int = 3
    min_samples_split: int = 2
    min_samples_leaf: int = 1
    criterion: str = "gini"


class RandomForestRequest(BaseModel):
    dataset: str = "moons"
    n_samples: int = 200
    noise: float = 0.2
    test_size: float = 0.25
    seed: int = 42
    resolution: int = 80
    n_estimators: int = 10
    max_depth: int = 5
    max_features: str = "sqrt"
    min_samples_split: int = 2
    bootstrap: bool = True


class BiasVarianceRequest(BaseModel):
    dataset: str = "moons"
    n_samples: int = 200
    noise: float = 0.2
    test_size: float = 0.25
    seed: int = 42
    model_type: str = "decision_tree"


class CompareRequest(BaseModel):
    dataset: str = "moons"
    n_samples: int = 200
    noise: float = 0.2
    test_size: float = 0.25
    seed: int = 42
    resolution: int = 70
    model_a: str = "logistic"
    a_C: float = 1.0
    a_penalty: str = "l2"
    a_k: int = 5
    a_kernel: str = "rbf"
    a_gamma: float = 1.0
    a_max_depth: int = 4
    a_n_estimators: int = 20
    model_b: str = "svm"
    b_C: float = 1.0
    b_penalty: str = "l2"
    b_k: int = 5
    b_kernel: str = "rbf"
    b_gamma: float = 1.0
    b_max_depth: int = 4
    b_n_estimators: int = 20


class GradientBoostingRequest(BaseModel):
    dataset: str = "moons"
    n_samples: int = 200
    noise: float = 0.2
    test_size: float = 0.25
    seed: int = 42
    resolution: int = 80
    n_estimators: int = 100
    learning_rate: float = 0.1
    max_depth: int = 3
    subsample: float = 1.0


class NaiveBayesRequest(BaseModel):
    dataset: str = "blobs"
    n_samples: int = 200
    noise: float = 0.2
    test_size: float = 0.25
    seed: int = 42
    resolution: int = 80
    var_smoothing_exp: float = -9.0


class NeuralNetRequest(BaseModel):
    dataset: str = "moons"
    n_samples: int = 200
    noise: float = 0.2
    test_size: float = 0.25
    seed: int = 42
    resolution: int = 80
    hidden_layers: int = 1
    neurons_per_layer: int = 8
    activation: str = "relu"
    learning_rate_init: float = 0.001
    max_iter: int = 500
    alpha: float = 0.0001


class CSVModelRequest(BaseModel):
    csv_data: str
    feature_x: str
    feature_y: str
    label_col: str
    model_type: str = "logistic"
    test_size: float = 0.25
    seed: int = 42
    resolution: int = 70
    C: float = 1.0
    n_neighbors: int = 5
    max_depth: int = 4
    n_estimators: int = 20
    gamma: float = 1.0
