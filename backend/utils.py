import numpy as np


def compute_decision_boundary(model, X_scaled: np.ndarray, resolution: int = 80):
    x0_min, x0_max = X_scaled[:, 0].min() - 0.6, X_scaled[:, 0].max() + 0.6
    x1_min, x1_max = X_scaled[:, 1].min() - 0.6, X_scaled[:, 1].max() + 0.6
    xx0 = np.linspace(x0_min, x0_max, resolution)
    xx1 = np.linspace(x1_min, x1_max, resolution)
    g0, g1 = np.meshgrid(xx0, xx1)
    grid = np.c_[g0.ravel(), g1.ravel()]
    probs = model.predict_proba(grid)[:, 1].reshape(resolution, resolution)
    return {
        "x0": xx0.tolist(), "x1": xx1.tolist(),
        "probs": probs.tolist(),
        "x0_min": float(x0_min), "x0_max": float(x0_max),
        "x1_min": float(x1_min), "x1_max": float(x1_max),
    }


def get_fit_status(train_acc: float, test_acc: float):
    gap = train_acc - test_acc
    if test_acc < 0.6:
        return "underfitting", round(gap, 4)
    if gap > 0.12:
        return "overfitting", round(gap, 4)
    return "good", round(gap, 4)


def scatter_points(X: np.ndarray, y: np.ndarray):
    return [
        {"x": float(X[i, 0]), "y": float(X[i, 1]), "label": int(y[i])}
        for i in range(len(y))
    ]
