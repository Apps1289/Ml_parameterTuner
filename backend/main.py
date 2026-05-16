from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sklearn.linear_model import LinearRegression, Ridge, Lasso, ElasticNet, LogisticRegression
from sklearn.preprocessing import PolynomialFeatures, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import mean_squared_error, r2_score, accuracy_score, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.svm import SVC
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.naive_bayes import GaussianNB
from sklearn.neural_network import MLPClassifier
import numpy as np
import json
import io
import pandas as pd

from config import ALLOWED_ORIGINS, DEBUG, LOG_LEVEL
from logger import get_logger
from schemas import (
    LinearRegressionRequest, LogisticRegressionRequest, KNNRequest, SVMRequest,
    DecisionTreeRequest, RandomForestRequest, BiasVarianceRequest, CompareRequest,
    GradientBoostingRequest, NaiveBayesRequest, NeuralNetRequest, CSVModelRequest
)
from data_generators import generate_regression_dataset, generate_classification_dataset, get_regression_datasets
from utils import compute_decision_boundary, get_fit_status, scatter_points
from auth import router as auth_router, ensure_tables

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Runs once at startup — replaces deprecated @app.on_event("startup")
    ensure_tables()
    yield


app = FastAPI(title="ML Visual Explorer API", debug=DEBUG, lifespan=lifespan)

# CORS middleware MUST be added before routers so preflight OPTIONS requests work
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register auth routes (signup/login)
app.include_router(auth_router)

logger.info(f"Starting ML Visual Explorer API - Debug: {DEBUG}, Log Level: {LOG_LEVEL}")


@app.get("/")
def root():
    return {"status": "ML Visual Explorer API running"}


# ════════════════════════════════════════════════════════════════
# LINEAR REGRESSION
# ════════════════════════════════════════════════════════════════

def build_regression_model(req: LinearRegressionRequest):
    if req.model_type == "linear":
        return LinearRegression(fit_intercept=req.fit_intercept)
    elif req.model_type == "ridge":
        return Ridge(alpha=req.ridge_alpha, fit_intercept=req.fit_intercept)
    elif req.model_type == "lasso":
        return Lasso(alpha=req.lasso_alpha, max_iter=req.lasso_max_iter, fit_intercept=req.fit_intercept)
    elif req.model_type == "elasticnet":
        return ElasticNet(alpha=req.elastic_alpha, l1_ratio=req.elastic_l1_ratio, fit_intercept=req.fit_intercept)
    elif req.model_type == "polynomial":
        return Pipeline([
            ("poly", PolynomialFeatures(degree=req.degree, include_bias=req.fit_intercept)),
            ("reg", LinearRegression(fit_intercept=False))
        ])
    return LinearRegression()


@app.post("/api/linear-regression")
def run_linear_regression(req: LinearRegressionRequest):
    logger.info(f"Linear regression request: model_type={req.model_type}, dataset={req.dataset}")
    x, y = generate_regression_dataset(req.dataset, req.n_samples, req.noise, req.seed)
    X = x.reshape(-1, 1)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=req.test_size, random_state=req.seed)
    model = build_regression_model(req)
    model.fit(X_train, y_train)
    y_train_pred = model.predict(X_train)
    y_test_pred = model.predict(X_test)
    train_r2 = r2_score(y_train, y_train_pred)
    test_r2 = r2_score(y_test, y_test_pred)
    train_mse = mean_squared_error(y_train, y_train_pred)
    test_mse = mean_squared_error(y_test, y_test_pred)
    gap = train_r2 - test_r2
    if test_r2 < 0.3:
        fit_status = "underfitting"
    elif gap > 0.2:
        fit_status = "overfitting"
    else:
        fit_status = "good"
    x_line = np.linspace(-3.2, 3.2, 200)
    y_line = model.predict(x_line.reshape(-1, 1))
    if req.model_type == "polynomial":
        coef = model.named_steps["reg"].coef_.tolist()
        intercept = 0.0
    else:
        coef = model.coef_.tolist()
        intercept = float(model.intercept_) if req.fit_intercept else 0.0
    return {
        "scatter": {
            "train": [{"x": float(xi[0]), "y": float(yi)} for xi, yi in zip(X_train, y_train)],
            "test": [{"x": float(xi[0]), "y": float(yi)} for xi, yi in zip(X_test, y_test)],
        },
        "line": [{"x": float(xi), "y": float(yi)} for xi, yi in zip(x_line, y_line)],
        "metrics": {
            "train_r2": round(train_r2, 4), "test_r2": round(test_r2, 4),
            "train_mse": round(train_mse, 4), "test_mse": round(test_mse, 4),
            "fit_status": fit_status, "gap": round(gap, 4),
        },
        "model_info": {"coef": coef, "intercept": intercept, "model_type": req.model_type}
    }


@app.get("/api/datasets")
def list_datasets():
    return get_regression_datasets()


# ════════════════════════════════════════════════════════════════
# LOGISTIC REGRESSION
# ════════════════════════════════════════════════════════════════

@app.post("/api/logistic-regression")
def run_logistic_regression(req: LogisticRegressionRequest):
    logger.info(f"Logistic regression request: dataset={req.dataset}")
    X, y = generate_classification_dataset(req.dataset, req.n_samples, req.noise, req.seed)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=req.test_size, random_state=req.seed, stratify=y
    )
    solver = req.solver
    penalty = req.penalty
    if penalty == "l1":
        solver = "liblinear"
    if penalty == "none":
        solver = "lbfgs"
    model = LogisticRegression(
        C=req.C,
        penalty=penalty if penalty != "none" else None,
        solver=solver,
        max_iter=req.max_iter,
        random_state=req.seed,
    )
    model.fit(X_train, y_train)
    train_acc = accuracy_score(y_train, model.predict(X_train))
    test_acc = accuracy_score(y_test, model.predict(X_test))
    cm = confusion_matrix(y_test, model.predict(X_test)).tolist()
    status, gap = get_fit_status(train_acc, test_acc)
    boundary = compute_decision_boundary(model, X, req.resolution)
    return {
        "scatter": {
            "train": scatter_points(X_train, y_train),
            "test": scatter_points(X_test, y_test),
        },
        "boundary": boundary,
        "metrics": {
            "train_acc": round(train_acc, 4),
            "test_acc": round(test_acc, 4),
            "fit_status": status,
            "gap": gap,
            "confusion_matrix": cm,
        },
        "model_info": {
            "coef": model.coef_.tolist(),
            "intercept": model.intercept_.tolist(),
            "penalty": penalty,
            "C": req.C,
        }
    }


# ════════════════════════════════════════════════════════════════
# KNN
# ════════════════════════════════════════════════════════════════

@app.post("/api/knn")
def run_knn(req: KNNRequest):
    logger.info(f"KNN request: dataset={req.dataset}, n_neighbors={req.n_neighbors}")
    X, y = generate_classification_dataset(req.dataset, req.n_samples, req.noise, req.seed)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=req.test_size, random_state=req.seed, stratify=y
    )
    metric = req.metric if req.metric != "minkowski" else "minkowski"
    model = KNeighborsClassifier(
        n_neighbors=req.n_neighbors,
        metric=metric,
        weights=req.weights,
        p=req.p,
    )
    model.fit(X_train, y_train)
    train_acc = accuracy_score(y_train, model.predict(X_train))
    test_acc = accuracy_score(y_test, model.predict(X_test))
    cm = confusion_matrix(y_test, model.predict(X_test)).tolist()
    status, gap = get_fit_status(train_acc, test_acc)
    boundary = compute_decision_boundary(model, X, req.resolution)
    return {
        "scatter": {"train": scatter_points(X_train, y_train), "test": scatter_points(X_test, y_test)},
        "boundary": boundary,
        "metrics": {
            "train_acc": round(train_acc, 4), "test_acc": round(test_acc, 4),
            "fit_status": status, "gap": gap, "confusion_matrix": cm,
        },
        "model_info": {
            "n_neighbors": req.n_neighbors, "metric": req.metric,
            "weights": req.weights, "p": req.p,
        }
    }


# ════════════════════════════════════════════════════════════════
# SVM
# ════════════════════════════════════════════════════════════════

@app.post("/api/svm")
def run_svm(req: SVMRequest):
    logger.info(f"SVM request: dataset={req.dataset}, kernel={req.kernel}")
    X, y = generate_classification_dataset(req.dataset, req.n_samples, req.noise, req.seed)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=req.test_size, random_state=req.seed, stratify=y
    )
    model = SVC(
        C=req.C,
        kernel=req.kernel,
        gamma=req.gamma,
        degree=req.degree,
        coef0=req.coef0,
        probability=True,
        random_state=req.seed,
    )
    model.fit(X_train, y_train)
    train_acc = accuracy_score(y_train, model.predict(X_train))
    test_acc = accuracy_score(y_test, model.predict(X_test))
    cm = confusion_matrix(y_test, model.predict(X_test)).tolist()
    status, gap = get_fit_status(train_acc, test_acc)
    boundary = compute_decision_boundary(model, X, req.resolution)
    n_sv = int(model.support_vectors_.shape[0])
    return {
        "scatter": {"train": scatter_points(X_train, y_train), "test": scatter_points(X_test, y_test)},
        "boundary": boundary,
        "metrics": {
            "train_acc": round(train_acc, 4), "test_acc": round(test_acc, 4),
            "fit_status": status, "gap": gap, "confusion_matrix": cm,
        },
        "model_info": {
            "kernel": req.kernel, "C": req.C, "gamma": req.gamma,
            "degree": req.degree, "n_support_vectors": n_sv,
        }
    }


# ════════════════════════════════════════════════════════════════
# DECISION TREE
# ════════════════════════════════════════════════════════════════

@app.post("/api/decision-tree")
def run_decision_tree(req: DecisionTreeRequest):
    logger.info(f"Decision Tree request: dataset={req.dataset}, max_depth={req.max_depth}")
    X, y = generate_classification_dataset(req.dataset, req.n_samples, req.noise, req.seed)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=req.test_size, random_state=req.seed, stratify=y
    )
    model = DecisionTreeClassifier(
        max_depth=req.max_depth,
        min_samples_split=req.min_samples_split,
        min_samples_leaf=req.min_samples_leaf,
        criterion=req.criterion,
        random_state=req.seed,
    )
    model.fit(X_train, y_train)
    train_acc = accuracy_score(y_train, model.predict(X_train))
    test_acc = accuracy_score(y_test, model.predict(X_test))
    cm = confusion_matrix(y_test, model.predict(X_test)).tolist()
    status, gap = get_fit_status(train_acc, test_acc)
    boundary = compute_decision_boundary(model, X, req.resolution)
    return {
        "scatter": {"train": scatter_points(X_train, y_train), "test": scatter_points(X_test, y_test)},
        "boundary": boundary,
        "metrics": {"train_acc": round(train_acc, 4), "test_acc": round(test_acc, 4),
                    "fit_status": status, "gap": gap, "confusion_matrix": cm},
        "model_info": {"max_depth": req.max_depth, "criterion": req.criterion,
                       "min_samples_split": req.min_samples_split,
                       "min_samples_leaf": req.min_samples_leaf,
                       "n_leaves": int(model.get_n_leaves()),
                       "depth_used": int(model.get_depth())}
    }


# ════════════════════════════════════════════════════════════════
# RANDOM FOREST
# ════════════════════════════════════════════════════════════════

@app.post("/api/random-forest")
def run_random_forest(req: RandomForestRequest):
    logger.info(f"Random Forest request: dataset={req.dataset}, n_estimators={req.n_estimators}")
    X, y = generate_classification_dataset(req.dataset, req.n_samples, req.noise, req.seed)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=req.test_size, random_state=req.seed, stratify=y
    )
    max_features = None if req.max_features == "none" else req.max_features
    model = RandomForestClassifier(
        n_estimators=req.n_estimators,
        max_depth=req.max_depth,
        max_features=max_features,
        min_samples_split=req.min_samples_split,
        bootstrap=req.bootstrap,
        random_state=req.seed,
    )
    model.fit(X_train, y_train)
    train_acc = accuracy_score(y_train, model.predict(X_train))
    test_acc = accuracy_score(y_test, model.predict(X_test))
    cm = confusion_matrix(y_test, model.predict(X_test)).tolist()
    status, gap = get_fit_status(train_acc, test_acc)
    boundary = compute_decision_boundary(model, X, req.resolution)
    importances = model.feature_importances_.tolist()
    return {
        "scatter": {"train": scatter_points(X_train, y_train), "test": scatter_points(X_test, y_test)},
        "boundary": boundary,
        "metrics": {"train_acc": round(train_acc, 4), "test_acc": round(test_acc, 4),
                    "fit_status": status, "gap": gap, "confusion_matrix": cm},
        "model_info": {"n_estimators": req.n_estimators, "max_depth": req.max_depth,
                       "max_features": req.max_features, "bootstrap": req.bootstrap,
                       "feature_importances": importances}
    }


# ════════════════════════════════════════════════════════════════
# BIAS-VARIANCE CURVE
# ════════════════════════════════════════════════════════════════

@app.post("/api/bias-variance")
def run_bias_variance(req: BiasVarianceRequest):
    logger.info(f"Bias-Variance request: dataset={req.dataset}, model_type={req.model_type}")
    X, y = generate_classification_dataset(req.dataset, req.n_samples, req.noise, req.seed)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=req.test_size, random_state=req.seed, stratify=y
    )
    points = []
    if req.model_type == "decision_tree":
        param_label = "max_depth"
        param_values = list(range(1, 21))
        for v in param_values:
            m = DecisionTreeClassifier(max_depth=v, random_state=req.seed)
            m.fit(X_train, y_train)
            points.append({"param": v,
                           "train": round(accuracy_score(y_train, m.predict(X_train)), 4),
                           "test": round(accuracy_score(y_test, m.predict(X_test)), 4)})
    elif req.model_type == "knn":
        param_label = "K (neighbours)"
        param_values = list(range(1, 31))
        for v in param_values:
            m = KNeighborsClassifier(n_neighbors=v)
            m.fit(X_train, y_train)
            points.append({"param": v,
                           "train": round(accuracy_score(y_train, m.predict(X_train)), 4),
                           "test": round(accuracy_score(y_test, m.predict(X_test)), 4)})
    elif req.model_type == "svm_rbf":
        param_label = "Gamma (γ)"
        gammas = [0.01, 0.05, 0.1, 0.2, 0.3, 0.5, 0.7, 1.0, 1.5, 2.0, 3.0, 5.0, 7.0, 10.0]
        for v in gammas:
            m = SVC(kernel="rbf", C=1.0, gamma=v, probability=False, random_state=req.seed)
            m.fit(X_train, y_train)
            points.append({"param": round(v, 2),
                           "train": round(accuracy_score(y_train, m.predict(X_train)), 4),
                           "test": round(accuracy_score(y_test, m.predict(X_test)), 4)})
    return {"points": points, "param_label": param_label}


# ════════════════════════════════════════════════════════════════
# MODEL COMPARISON
# ════════════════════════════════════════════════════════════════

def build_compare_model(mtype: str, req: CompareRequest, prefix: str):
    C = getattr(req, f"{prefix}_C")
    penalty = getattr(req, f"{prefix}_penalty")
    k = getattr(req, f"{prefix}_k")
    kernel = getattr(req, f"{prefix}_kernel")
    gamma = getattr(req, f"{prefix}_gamma")
    max_depth = getattr(req, f"{prefix}_max_depth")
    n_est = getattr(req, f"{prefix}_n_estimators")

    if mtype == "logistic":
        solver = "liblinear" if penalty == "l1" else "lbfgs"
        return LogisticRegression(C=C, penalty=penalty if penalty != "none" else None,
                                  solver=solver, max_iter=1000, random_state=req.seed)
    elif mtype == "knn":
        return KNeighborsClassifier(n_neighbors=k)
    elif mtype == "svm":
        return SVC(C=C, kernel=kernel, gamma=gamma, probability=True, random_state=req.seed)
    elif mtype == "decision_tree":
        return DecisionTreeClassifier(max_depth=max_depth, random_state=req.seed)
    elif mtype == "random_forest":
        return RandomForestClassifier(n_estimators=n_est, max_depth=max_depth, random_state=req.seed)
    return LogisticRegression()


@app.post("/api/compare")
def run_compare(req: CompareRequest):
    logger.info(f"Compare request: model_a={req.model_a}, model_b={req.model_b}")
    X, y = generate_classification_dataset(req.dataset, req.n_samples, req.noise, req.seed)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=req.test_size, random_state=req.seed, stratify=y
    )
    results = {}
    for label, mtype, prefix in [("a", req.model_a, "a"), ("b", req.model_b, "b")]:
        model = build_compare_model(mtype, req, prefix)
        model.fit(X_train, y_train)
        train_acc = accuracy_score(y_train, model.predict(X_train))
        test_acc = accuracy_score(y_test, model.predict(X_test))
        cm = confusion_matrix(y_test, model.predict(X_test)).tolist()
        status, gap = get_fit_status(train_acc, test_acc)
        boundary = compute_decision_boundary(model, X, req.resolution)
        results[label] = {
            "scatter": {"train": scatter_points(X_train, y_train), "test": scatter_points(X_test, y_test)},
            "boundary": boundary,
            "metrics": {"train_acc": round(train_acc, 4), "test_acc": round(test_acc, 4),
                        "fit_status": status, "gap": gap, "confusion_matrix": cm},
            "model_type": mtype,
        }
    return results


# ════════════════════════════════════════════════════════════════
# GRADIENT BOOSTING
# ════════════════════════════════════════════════════════════════

@app.post("/api/gradient-boosting")
def run_gradient_boosting(req: GradientBoostingRequest):
    logger.info(f"Gradient Boosting request: dataset={req.dataset}")
    X, y = generate_classification_dataset(req.dataset, req.n_samples, req.noise, req.seed)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=req.test_size, random_state=req.seed, stratify=y
    )
    model = GradientBoostingClassifier(
        n_estimators=req.n_estimators,
        learning_rate=req.learning_rate,
        max_depth=req.max_depth,
        subsample=req.subsample,
        random_state=req.seed,
    )
    model.fit(X_train, y_train)
    train_acc = accuracy_score(y_train, model.predict(X_train))
    test_acc = accuracy_score(y_test, model.predict(X_test))
    cm = confusion_matrix(y_test, model.predict(X_test)).tolist()
    status, gap = get_fit_status(train_acc, test_acc)
    boundary = compute_decision_boundary(model, X, req.resolution)
    return {
        "scatter": {"train": scatter_points(X_train, y_train), "test": scatter_points(X_test, y_test)},
        "boundary": boundary,
        "metrics": {"train_acc": round(train_acc, 4), "test_acc": round(test_acc, 4),
                    "fit_status": status, "gap": gap, "confusion_matrix": cm},
        "model_info": {
            "n_estimators": req.n_estimators, "learning_rate": req.learning_rate,
            "max_depth": req.max_depth, "subsample": req.subsample,
            "feature_importances": model.feature_importances_.tolist()
        }
    }


# ════════════════════════════════════════════════════════════════
# NAIVE BAYES
# ════════════════════════════════════════════════════════════════

@app.post("/api/naive-bayes")
def run_naive_bayes(req: NaiveBayesRequest):
    logger.info(f"Naive Bayes request: dataset={req.dataset}")
    X, y = generate_classification_dataset(req.dataset, req.n_samples, req.noise, req.seed)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=req.test_size, random_state=req.seed, stratify=y
    )
    var_smoothing = 10 ** req.var_smoothing_exp
    model = GaussianNB(var_smoothing=var_smoothing)
    model.fit(X_train, y_train)
    train_acc = accuracy_score(y_train, model.predict(X_train))
    test_acc = accuracy_score(y_test, model.predict(X_test))
    cm = confusion_matrix(y_test, model.predict(X_test)).tolist()
    status, gap = get_fit_status(train_acc, test_acc)
    boundary = compute_decision_boundary(model, X, req.resolution)
    class_stats = []
    for i, cls in enumerate(model.classes_):
        class_stats.append({
            "class": int(cls),
            "mean": model.theta_[i].tolist(),
            "var": model.var_[i].tolist(),
            "prior": round(float(model.class_prior_[i]), 4)
        })
    return {
        "scatter": {"train": scatter_points(X_train, y_train), "test": scatter_points(X_test, y_test)},
        "boundary": boundary,
        "metrics": {"train_acc": round(train_acc, 4), "test_acc": round(test_acc, 4),
                    "fit_status": status, "gap": gap, "confusion_matrix": cm},
        "model_info": {
            "var_smoothing": float(var_smoothing),
            "var_smoothing_exp": req.var_smoothing_exp,
            "class_stats": class_stats
        }
    }


# ════════════════════════════════════════════════════════════════
# NEURAL NETWORK (MLP)
# ════════════════════════════════════════════════════════════════

@app.post("/api/neural-net")
def run_neural_net(req: NeuralNetRequest):
    logger.info(f"Neural Net request: dataset={req.dataset}, hidden_layers={req.hidden_layers}")
    X, y = generate_classification_dataset(req.dataset, req.n_samples, req.noise, req.seed)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=req.test_size, random_state=req.seed, stratify=y
    )
    hidden_layer_sizes = tuple([req.neurons_per_layer] * req.hidden_layers)
    model = MLPClassifier(
        hidden_layer_sizes=hidden_layer_sizes,
        activation=req.activation,
        learning_rate_init=req.learning_rate_init,
        max_iter=req.max_iter,
        alpha=req.alpha,
        random_state=req.seed,
        early_stopping=True,
        validation_fraction=0.1,
    )
    model.fit(X_train, y_train)
    train_acc = accuracy_score(y_train, model.predict(X_train))
    test_acc = accuracy_score(y_test, model.predict(X_test))
    cm = confusion_matrix(y_test, model.predict(X_test)).tolist()
    status, gap = get_fit_status(train_acc, test_acc)
    boundary = compute_decision_boundary(model, X, req.resolution)
    loss_curve = model.loss_curve_[:50] if hasattr(model, 'loss_curve_') else []
    return {
        "scatter": {"train": scatter_points(X_train, y_train), "test": scatter_points(X_test, y_test)},
        "boundary": boundary,
        "metrics": {"train_acc": round(train_acc, 4), "test_acc": round(test_acc, 4),
                    "fit_status": status, "gap": gap, "confusion_matrix": cm,
                    "n_iter": model.n_iter_},
        "model_info": {
            "hidden_layers": req.hidden_layers,
            "neurons_per_layer": req.neurons_per_layer,
            "activation": req.activation,
            "architecture": [2] + list(hidden_layer_sizes) + [1],
            "loss_curve": [round(v, 4) for v in loss_curve],
            "alpha": req.alpha,
        }
    }


# ════════════════════════════════════════════════════════════════
# CSV UPLOAD
# ════════════════════════════════════════════════════════════════

@app.post("/api/csv/upload")
async def upload_csv(file: UploadFile = File(...)):
    content = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(content))
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        all_cols = df.columns.tolist()
        preview = df.head(5).fillna("").to_dict(orient="records")
        logger.info(f"CSV uploaded: {file.filename}, rows={len(df)}")
        return {
            "columns": all_cols,
            "numeric_columns": numeric_cols,
            "n_rows": len(df),
            "preview": preview,
            "filename": file.filename,
        }
    except Exception as e:
        logger.error(f"CSV upload error: {str(e)}")
        return {"error": str(e)}


@app.post("/api/csv/run")
def run_csv_model(req: CSVModelRequest):
    try:
        logger.info(f"CSV model request: model_type={req.model_type}")
        records = json.loads(req.csv_data)
        df = pd.DataFrame(records)
        df = df[[req.feature_x, req.feature_y, req.label_col]].dropna()

        X_raw = df[[req.feature_x, req.feature_y]].values.astype(float)
        y_raw = df[req.label_col].values

        unique_labels = np.unique(y_raw)
        if len(unique_labels) != 2:
            return {"error": f"Label column must have exactly 2 classes, found: {list(unique_labels[:5])}"}
        label_map = {unique_labels[0]: 0, unique_labels[1]: 1}
        y = np.array([label_map[v] for v in y_raw])

        scaler = StandardScaler()
        X = scaler.fit_transform(X_raw)

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=req.test_size, random_state=req.seed, stratify=y
        )

        if req.model_type == "logistic":
            model = LogisticRegression(C=req.C, max_iter=1000, random_state=req.seed)
        elif req.model_type == "knn":
            model = KNeighborsClassifier(n_neighbors=req.n_neighbors)
        elif req.model_type == "svm":
            model = SVC(C=req.C, kernel="rbf", gamma=req.gamma, probability=True, random_state=req.seed)
        elif req.model_type == "decision_tree":
            model = DecisionTreeClassifier(max_depth=req.max_depth, random_state=req.seed)
        elif req.model_type == "random_forest":
            model = RandomForestClassifier(n_estimators=req.n_estimators, max_depth=req.max_depth, random_state=req.seed)
        else:
            model = LogisticRegression(C=req.C, max_iter=1000, random_state=req.seed)

        model.fit(X_train, y_train)
        train_acc = accuracy_score(y_train, model.predict(X_train))
        test_acc = accuracy_score(y_test, model.predict(X_test))
        cm = confusion_matrix(y_test, model.predict(X_test)).tolist()
        status, gap = get_fit_status(train_acc, test_acc)
        boundary = compute_decision_boundary(model, X, req.resolution)

        return {
            "scatter": {"train": scatter_points(X_train, y_train), "test": scatter_points(X_test, y_test)},
            "boundary": boundary,
            "metrics": {"train_acc": round(train_acc, 4), "test_acc": round(test_acc, 4),
                        "fit_status": status, "gap": gap, "confusion_matrix": cm},
            "label_map": {str(v): k for k, v in label_map.items()},
            "n_samples": len(y),
        }
    except Exception as e:
        logger.error(f"CSV model error: {str(e)}")
        return {"error": str(e)}


if __name__ == "__main__":
    import uvicorn
    from config import HOST, PORT
    uvicorn.run(app, host=HOST, port=PORT)
