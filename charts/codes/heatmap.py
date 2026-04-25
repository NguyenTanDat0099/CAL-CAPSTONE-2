"""
Heatmap - Bản đồ nhiệt
Prompts: charts/prompts/07_heatmap_prompt.md
"""
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np
from typing import Optional, List, Tuple, Union


class HeatmapConfig:
    """Cấu hình mặc định cho Heatmap."""

    DEFAULTS = {
        'figsize': (12, 8),
        'dpi': 150,
        'style': 'seaborn-v0_8-whitegrid',
        'colormaps': {
            'default': 'viridis',
            'diverging': 'coolwarm',
            'sequential': 'Blues',
            'warm': 'YlOrRd',
            'correlation': 'RdBu_r',
            'balance': 'RdYlGn',
        },
        'title_fontsize': 18,
        'label_fontsize': 12,
        'tick_fontsize': 10,
        'annot_fontsize': 10,
    }

    @staticmethod
    def apply_style(style: Optional[str] = None):
        try:
            plt.style.use(style or HeatmapConfig.DEFAULTS['style'])
        except Exception:
            pass

    @staticmethod
    def clean_spines(ax):
        for spine in ['top', 'right', 'bottom', 'left']:
            ax.spines[spine].set_visible(False)


# ============================================================
# BASIC HEATMAP (Matplotlib)
# ============================================================

def plot_heatmap(
    data: Union[np.ndarray, pd.DataFrame],
    xlabels: Optional[List[str]] = None,
    ylabels: Optional[List[str]] = None,
    title: str = '',
    cmap: str = 'coolwarm',
    vmin: Optional[float] = None,
    vmax: Optional[float] = None,
    center: Optional[float] = None,
    annot: bool = True,
    annot_format: str = '.1f',
    annot_fontsize: int = 10,
    annot_fontweight: str = 'normal',
    annot_color: Optional[str] = None,
    cbar: bool = True,
    cbar_label: str = '',
    cbar_fontsize: int = 11,
    linewidths: float = 0.5,
    linecolor: str = 'white',
    square: bool = True,
    aspect: Union[str, float] = 'auto',
    xlabel: str = '',
    ylabel: str = '',
    xtick_rotation: int = 45,
    ytick_rotation: int = 0,
    xlim: Optional[Tuple[float, float]] = None,
    ylim: Optional[Tuple[float, float]] = None,
    figsize: Tuple[int, int] = (12, 8),
    dpi: int = 150,
    style: Optional[str] = None,
    save_path: Optional[str] = None,
    show: bool = True
) -> plt.Figure:
    """
    Vẽ heatmap bằng matplotlib.

    Args:
        data: ma trận 2D (numpy array hoặc DataFrame)
        xlabels, ylabels: nhãn trục X và Y
        cmap: tên colormap
        vmin, vmax: giới hạn giá trị màu
        center: giá trị trung tâm (cho diverging colormap)
        annot: hiển thị số trên mỗi ô
        annot_format: format số ('.0f', '.1f', '.2f')
        annot_fontsize, annot_fontweight: style text annotate
        annot_color: 'auto' = tự chọn trắng/đen theo nền, None = dùng mặc định
        cbar: hiển thị colorbar
        cbar_label: nhãn colorbar
        linewidths, linecolor: style đường kẻ ô
        square: True = ô vuông
        save_path: đường dẫn lưu file
        show: hiển thị biểu đồ
    """
    HeatmapConfig.apply_style(style)
    fig, ax = plt.subplots(figsize=figsize, dpi=dpi)

    if isinstance(data, pd.DataFrame):
        data_arr = data.values
        if xlabels is None and hasattr(data, 'columns'):
            xlabels = list(data.columns)
        if ylabels is None and hasattr(data, 'index'):
            ylabels = list(data.index)
    else:
        data_arr = np.array(data)

    im = ax.imshow(data_arr, cmap=cmap, aspect=aspect,
                   vmin=vmin, vmax=vmax, interpolation='nearest')

    if xlabels is not None:
        ax.set_xticks(np.arange(data_arr.shape[1]))
        ax.set_xticklabels(xlabels, rotation=xtick_rotation,
                           ha='right', fontsize=HeatmapConfig.DEFAULTS['tick_fontsize'])
    if ylabels is not None:
        ax.set_yticks(np.arange(data_arr.shape[0]))
        ax.set_yticklabels(ylabels, rotation=ytick_rotation,
                           fontsize=HeatmapConfig.DEFAULTS['tick_fontsize'])

    ax.tick_params(top=False, bottom=True, labeltop=False,
                   labelbottom=True, left=True, right=False)

    if linewidths and linewidths > 0:
        ax.set_xticks(np.arange(data_arr.shape[1] + 1) - 0.5, minor=True)
        ax.set_yticks(np.arange(data_arr.shape[0] + 1) - 0.5, minor=True)
        ax.grid(which='minor', color=linecolor, linestyle='-',
                linewidth=linewidths, alpha=0.8)
        ax.tick_params(which='minor', bottom=False, left=False)

    if annot:
        data_min = np.nanmin(data_arr) if vmin is None else vmin
        data_max = np.nanmax(data_arr) if vmax is None else vmax
        mid = (data_min + data_max) / 2

        for i in range(data_arr.shape[0]):
            for j in range(data_arr.shape[1]):
                value = data_arr[i, j]
                if annot_color == 'auto':
                    text_color = 'white' if value > mid else 'black'
                else:
                    text_color = annot_color or 'black'

                ax.text(j, i, format(value, annot_format),
                        ha='center', va='center',
                        fontsize=annot_fontsize,
                        fontweight=annot_fontweight,
                        color=text_color)

    if cbar:
        cbar = fig.colorbar(im, ax=ax, shrink=0.8, aspect=30)
        if cbar_label:
            cbar.set_label(cbar_label, fontsize=cbar_fontsize)
        cbar.ax.tick_params(labelsize=HeatmapConfig.DEFAULTS['tick_fontsize'])

    if xlabel:
        ax.set_xlabel(xlabel, fontsize=HeatmapConfig.DEFAULTS['label_fontsize'], labelpad=10)
    if ylabel:
        ax.set_ylabel(ylabel, fontsize=HeatmapConfig.DEFAULTS['label_fontsize'], labelpad=10)
    if title:
        ax.set_title(title, fontsize=HeatmapConfig.DEFAULTS['title_fontsize'],
                     fontweight='bold', pad=15)

    if xlim:
        ax.set_xlim(xlim)
    if ylim:
        ax.set_ylim(ylim)

    HeatmapConfig.clean_spines(ax)
    plt.tight_layout()

    if save_path:
        fig.savefig(save_path, dpi=300, bbox_inches='tight', facecolor='white')

    if show:
        plt.show()

    return fig


# ============================================================
# CORRELATION HEATMAP
# ============================================================

def plot_correlation_heatmap(
    df: pd.DataFrame,
    method: str = 'pearson',
    title: str = '',
    cmap: str = 'coolwarm',
    vmin: float = -1,
    vmax: float = 1,
    center: float = 0,
    annot: bool = True,
    annot_format: str = '.2f',
    annot_fontsize: int = 10,
    linewidths: float = 0.5,
    linecolor: str = 'white',
    mask_diagonal: bool = False,
    mask_upper: bool = False,
    xlabels: Optional[List[str]] = None,
    ylabels: Optional[List[str]] = None,
    xtick_rotation: int = 45,
    ytick_rotation: int = 0,
    figsize: Optional[Tuple[int, int]] = None,
    dpi: int = 150,
    style: Optional[str] = None,
    save_path: Optional[str] = None,
    show: bool = True
) -> plt.Figure:
    """
    Vẽ correlation heatmap từ DataFrame.

    Args:
        df: DataFrame chứa các cột numeric
        method: 'pearson', 'spearman', 'kendall'
        cmap: colormap (nên dùng diverging như coolwarm, RdBu)
        vmin, vmax: -1, 1 cho correlation
        center: 0 cho diverging colormap
        mask_diagonal: ẩn đường chéo chính
        mask_upper: ẩn nửa trên của ma trận
        save_path: đường dẫn lưu file
        show: hiển thị biểu đồ
    """
    HeatmapConfig.apply_style(style)

    corr = df.corr(method=method)

    if xlabels is None:
        xlabels = list(corr.columns)
    if ylabels is None:
        ylabels = list(corr.index)
    if figsize is None:
        n = len(corr.columns)
        figsize = (max(8, n * 1.2), max(6, n * 1.0))

    mask = np.zeros_like(corr.values, dtype=bool)
    if mask_diagonal:
        np.fill_diagonal(mask, True)
    if mask_upper:
        mask |= np.triu(np.ones_like(corr.values, dtype=bool))

    fig, ax = plt.subplots(figsize=figsize, dpi=dpi)

    im = ax.imshow(corr.values, cmap=cmap, vmin=vmin, vmax=vmax,
                  aspect='auto', interpolation='nearest')

    ax.set_xticks(np.arange(len(xlabels)))
    ax.set_yticks(np.arange(len(ylabels)))
    ax.set_xticklabels(xlabels, rotation=xtick_rotation,
                        ha='right', fontsize=HeatmapConfig.DEFAULTS['tick_fontsize'])
    ax.set_yticklabels(ylabels, rotation=ytick_rotation,
                        fontsize=HeatmapConfig.DEFAULTS['tick_fontsize'])

    if linewidths and linewidths > 0:
        ax.set_xticks(np.arange(len(xlabels) + 1) - 0.5, minor=True)
        ax.set_yticks(np.arange(len(ylabels) + 1) - 0.5, minor=True)
        ax.grid(which='minor', color=linecolor, linestyle='-',
                linewidth=linewidths, alpha=0.8)
        ax.tick_params(which='minor', bottom=False, left=False)

    if annot:
        for i in range(len(ylabels)):
            for j in range(len(xlabels)):
                if not (mask_diagonal and i == j) and not (mask_upper and i < j):
                    value = corr.values[i, j]
                    mid = (vmin + vmax) / 2
                    text_color = 'white' if value > mid else 'black'
                    ax.text(j, i, format(value, annot_format),
                            ha='center', va='center',
                            fontsize=annot_fontsize, color=text_color)

    cbar = fig.colorbar(im, ax=ax, shrink=0.8, aspect=30)
    cbar.set_label('Hệ số tương quan', fontsize=HeatmapConfig.DEFAULTS['label_fontsize'])
    cbar.ax.tick_params(labelsize=HeatmapConfig.DEFAULTS['tick_fontsize'])

    if title:
        ax.set_title(title, fontsize=HeatmapConfig.DEFAULTS['title_fontsize'],
                     fontweight='bold', pad=15)

    HeatmapConfig.clean_spines(ax)
    ax.tick_params(top=False, bottom=True, labeltop=False,
                   labelbottom=True, left=True, right=False)
    plt.tight_layout()

    if save_path:
        fig.savefig(save_path, dpi=300, bbox_inches='tight', facecolor='white')

    if show:
        plt.show()

    return fig


# ============================================================
# SEABORN HEATMAP (if available)
# ============================================================

def plot_seaborn_heatmap(
    data: Union[pd.DataFrame, np.ndarray],
    annot: bool = True,
    fmt: str = '.2f',
    cmap: str = 'coolwarm',
    center: Optional[float] = None,
    vmin: Optional[float] = None,
    vmax: Optional[float] = None,
    linewidths: float = 0.5,
    cbar: bool = True,
    cbar_kws: Optional[dict] = None,
    title: str = '',
    xlabel: str = '',
    ylabel: str = '',
    xticklabels: Union[bool, List[str]] = True,
    yticklabels: Union[bool, List[str]] = True,
    xtick_rotation: int = 45,
    ytick_rotation: int = 0,
    figsize: Tuple[int, int] = (12, 8),
    dpi: int = 150,
    style: Optional[str] = None,
    save_path: Optional[str] = None,
    show: bool = True
) -> plt.Figure:
    """
    Vẽ heatmap bằng seaborn (nếu có).

    Args:
        save_path: đường dẫn lưu file
        show: hiển thị biểu đồ
    """
    try:
        import seaborn as sns
    except ImportError:
        return plot_heatmap(data=data, title=title, cmap=cmap,
                            vmin=vmin, vmax=vmax, center=center,
                            annot=annot, annot_format=fmt,
                            linewidths=linewidths,
                            figsize=figsize, dpi=dpi, style=style,
                            save_path=save_path, show=show)

    HeatmapConfig.apply_style(style)
    fig, ax = plt.subplots(figsize=figsize, dpi=dpi)

    sns.heatmap(data=data, annot=annot, fmt=fmt, cmap=cmap,
                center=center, vmin=vmin, vmax=vmax,
                linewidths=linewidths, linecolor='white',
                cbar=cbar, cbar_kws=cbar_kws or {},
                xticklabels=xticklabels, yticklabels=yticklabels,
                ax=ax)

    ax.set_xticklabels(ax.get_xticklabels(), rotation=xtick_rotation,
                        ha='right', fontsize=HeatmapConfig.DEFAULTS['tick_fontsize'])
    ax.set_yticklabels(ax.get_yticklabels(), rotation=ytick_rotation,
                        fontsize=HeatmapConfig.DEFAULTS['tick_fontsize'])

    if title:
        ax.set_title(title, fontsize=HeatmapConfig.DEFAULTS['title_fontsize'],
                     fontweight='bold', pad=15)
    if xlabel:
        ax.set_xlabel(xlabel, fontsize=HeatmapConfig.DEFAULTS['label_fontsize'])
    if ylabel:
        ax.set_ylabel(ylabel, fontsize=HeatmapConfig.DEFAULTS['label_fontsize'])

    plt.tight_layout()

    if save_path:
        fig.savefig(save_path, dpi=300, bbox_inches='tight', facecolor='white')

    if show:
        plt.show()

    return fig


# ============================================================
# USAGE EXAMPLES
# ============================================================

if __name__ == '__main__':
    np.random.seed(42)

    # Sample matrix data
    months = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6']
    products = ['Sản phẩm A', 'Sản phẩm B', 'Sản phẩm C', 'Sản phẩm D']
    matrix = np.array([
        [120, 135, 110, 160, 175, 190],
        [85,  95,  90,  100, 110, 120],
        [150, 140, 160, 155, 170, 180],
        [90,  95,  85,  90,  100, 110],
    ])

    df_matrix = pd.DataFrame(matrix, index=products, columns=months)

    # Correlation data
    df_corr = pd.DataFrame({
        'Tuổi': [25, 35, 45, 55, 65],
        'Thu nhập': [30, 50, 70, 80, 90],
        'Chi tiêu': [20, 35, 50, 60, 70],
        'Tiết kiệm': [10, 15, 20, 20, 20],
        'Nợ': [5, 10, 15, 25, 35],
    })

    print("=== Heatmap Examples ===\n")

    # 1. Basic heatmap
    plot_heatmap(
        data=df_matrix,
        title='Doanh số theo sản phẩm và tháng',
        cmap='YlOrRd',
        annot=True, annot_format='.0f',
        cbar_label='Doanh số (Triệu)',
        linewidths=1,
        show=False, save_path='charts/output/heatmap_basic.png'
    )
    print("1. Basic heatmap: charts/output/heatmap_basic.png")

    # 2. Correlation heatmap
    plot_correlation_heatmap(
        df=df_corr,
        title='Ma trận tương quan',
        cmap='coolwarm',
        annot=True, annot_format='.2f',
        mask_upper=True,
        linewidths=0.5,
        show=False, save_path='charts/output/heatmap_correlation.png'
    )
    print("2. Correlation heatmap: charts/output/heatmap_correlation.png")

    # 3. Diverging heatmap (positive/negative values)
    diverging_data = np.array([
        [10, 5, -2, -5, -10],
        [8, 3, 0, -3, -8],
        [5, 2, 1, -2, -5],
        [2, 1, 0, -1, -2],
        [-5, -3, 0, 3, 5],
    ])
    plot_heatmap(
        data=diverging_data,
        xlabels=['A', 'B', 'C', 'D', 'E'],
        ylabels=['W', 'X', 'Y', 'Z', 'W2'],
        title='Biến động (Diverging Heatmap)',
        cmap='RdYlGn',
        center=0,
        annot=True, annot_format='.0f',
        cbar_label='Chênh lệch',
        linewidths=0.5,
        show=False, save_path='charts/output/heatmap_diverging.png'
    )
    print("3. Diverging heatmap: charts/output/heatmap_diverging.png")
