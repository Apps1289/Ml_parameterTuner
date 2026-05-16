import numpy as np
from sklearn.datasets import make_classification, make_moons, make_circles, make_blobs
from sklearn.preprocessing import StandardScaler


def generate_regression_dataset(name: str, n: int, noise: float, seed: int):
    rng = np.random.RandomState(seed)
    x = rng.uniform(-3, 3, n)
    if name == "linear":
        y = 2.5 * x + 1.0 + rng.normal(0, noise * 3, n)
    elif name == "polynomial":
        y = 0.5 * x**2 - x + 2 + rng.normal(0, noise * 3, n)
    elif name == "noisy":
        y = 2 * x + rng.normal(0, noise * 8, n)
    elif name == "sine":
        y = np.sin(x * 1.5) * 3 + rng.normal(0, noise * 2, n)
    else:
        y = 2.5 * x + 1.0 + rng.normal(0, noise * 3, n)
    return x, y


def generate_classification_dataset(name: str, n_samples: int, noise: float, seed: int):
    if name == "moons":
        X, y = make_moons(n_samples=n_samples, noise=noise, random_state=seed)
    elif name == "circles":
        X, y = make_circles(n_samples=n_samples, noise=noise, factor=0.5, random_state=seed)
    elif name == "blobs":
        X, y = make_blobs(n_samples=n_samples, centers=2, cluster_std=noise*4+0.5, random_state=seed)
    else:  # linear
        rng = np.random.RandomState(seed)
        X, y = make_classification(
            n_samples=n_samples, n_features=2, n_redundant=0,
            n_informative=2, random_state=seed, n_clusters_per_class=1
        )
        X += rng.normal(0, noise * 0.5, X.shape)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    return X_scaled, y


def get_regression_datasets():
    return {
        "datasets": [
            {"id": "linear", "label": "Linear", "description": "Clean linear trend"},
            {"id": "polynomial", "label": "Polynomial", "description": "Curved quadratic pattern"},
            {"id": "noisy", "label": "High Noise", "description": "Very noisy linear data"},
            {"id": "sine", "label": "Sine Wave", "description": "Sinusoidal non-linear data"},
        ]
    }
