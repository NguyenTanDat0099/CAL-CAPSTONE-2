"""
Histogram - Biểu đồ tần suất
Prompts: charts/prompts/04_histogram_prompt.md
"""
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np
from typing import Optional, List, Tuple, Union


class HistogramConfig:
    """Cấu hình mặc định cho Histogram."""

    DEFAULTS = {
        'figsize': (10, 6),
        'dpi': 150,
        'style': 'seaborn-v0_8-whitegrid',
        'colors': ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'],
        'title_fontsize': 18,
        'label_fontsize': 13,
        'tick_fontsize': 11,
        'legend_fontsize': 12,
    }

    @staticmethod
    def apply_style(style: Optional[str] = None):
        try:
            plt.style.use(style or HistogramConfig.DEFAULTS['style'])
        except Exception:
            pass

    @staticmethod
    def clean_spines(ax):
        for spine in ['top', 'right']:
            ax.spines[spine].set_visible(False)


# ============================================================
# BASIC HISTOGRAM
# ============================================================

def plot_histogram(
    data: Union[pd.Series, np.ndarray, List],
    bins: int = 30,
    range: Optional[Tuple[float, float]] = None,
    title: str = '',
    xlabel: str = '',
    ylabel: str = 'Tần suất',
    color: str = '#3498db',
    edgecolor: str = 'white',
    linewidth: float = 1.2,
    alpha: float = 0.75,
    histtype: str = 'bar',
    density: bool = False,
    figsize: Tuple[int, int] = (10, 6),
    dpi: int = 150,
    style: Optional[str] = None,
    grid: bool = True,
    grid_axis: str = 'y',
    grid_alpha: float = 0.5,
    mean_line: bool = False,
    mean_color: str = '#e74c3c',
    mean_linestyle: str = '--',
    median_line: bool = False,
    median_color: str = '#2ecc71',
    median_linestyle: str = ':',
    kde: bool = False,
    kde_color: str = '#e74c3c',
    kde_linewidth: float = 2.5,
    save_path: Optional[str] = None,
    show: bool = True
) -> plt.Figure:
    """
    Vẽ histogram.

    Args:
        data: dữ liệu cần vẽ histogram
        bins: số bins (khoảng chia)
        range: (min, max) giới hạn giá trị
        histtype: 'bar' (cột), 'step' (đường), 'stepfilled' (đường tô)
        density: True = normalized (PDF thay vì count)
        mean_line: vẽ đường mean
        median_line: vẽ đường median
        kde: vẽ đường KDE (cần scipy)
        save_path: đường dẫn lưu file
        show: hiển thị biểu đồ
    """
    HistogramConfig.apply_style(style)
    fig, ax = plt.subplots(figsize=figsize, dpi=dpi)

    ax.hist(data, bins=bins, range=range, density=density,
            color=color, edgecolor=edgecolor, linewidth=linewidth,
            alpha=alpha, histtype=histtype)

    if grid:
        ax.grid(True, axis=grid_axis, linestyle='--', alpha=grid_alpha)

    data_arr = np.array(data)
    data_arr = data_arr[~np.isnan(data_arr)]

    if mean_line:
        mean_val = np.mean(data_arr)
        ax.axvline(mean_val, color=mean_color, linestyle=mean_linestyle,
                   linewidth=2, label=f'Mean: {mean_val:.1f}')

    if median_line:
        median_val = np.median(data_arr)
        ax.axvline(median_val, color=median_color, linestyle=median_linestyle,
                   linewidth=2, label=f'Median: {median_val:.1f}')

    if kde:
        try:
            from scipy import stats
            x_range = np.linspace(data_arr.min(), data_arr.max(), 300)
            kde_func = stats.gaussian_kde(data_arr)
            scale = max(ax.get_ylim()) if not density else 1
            ax.plot(x_range, kde_func(x_range) * scale,
                    color=kde_color, linewidth=kde_linewidth, label='KDE')
            ax.legend(fontsize=HistogramConfig.DEFAULTS['legend_fontsize'])
        except ImportError:
            pass

    if title:
        ax.set_title(title, fontsize=HistogramConfig.DEFAULTS['title_fontsize'],
                     fontweight='bold', pad=15)
    if xlabel:
        ax.set_xlabel(xlabel, fontsize=HistogramConfig.DEFAULTS['label_fontsize'], labelpad=10)
    if ylabel:
        ylabel_text = 'Mật độ' if density else 'Tần suất'
        ax.set_ylabel(ylabel_text,
                       fontsize=HistogramConfig.DEFAULTS['label_fontsize'], labelpad=10)

    ax.tick_params(axis='both', labelsize=HistogramConfig.DEFAULTS['tick_fontsize'])

    HistogramConfig.clean_spines(ax)
    plt.tight_layout()

    if save_path:
        fig.savefig(save_path, dpi=300, bbox_inches='tight', facecolor='white')

    if show:
        plt.show()

    return fig


# ============================================================
# MULTIPLE HISTOGRAMS (Overlaid)
# ============================================================

def plot_multiple_histograms(
    data_dict: dict,
    bins: int = 20,
    title: str = '',
    xlabel: str = '',
    ylabel: str = 'Tần suất',
    colors: Optional[List[str]] = None,
    alpha: float = 0.6,
    histtype: str = 'bar',
    density: bool = False,
    legend_loc: str = 'best',
    figsize: Tuple[int, int] = (12, 7),
    dpi: int = 150,
    style: Optional[str] = None,
    grid: bool = True,
    grid_axis: str = 'y',
    save_path: Optional[str] = None,
    show: bool = True
) -> plt.Figure:
    """
    Vẽ nhiều histogram trên cùng một biểu đồ (overlay).

    Args:
        data_dict: dict với key=name, value=data array
        colors: danh sách màu
        alpha: độ trong suốt (nên thấp khi overlay nhiều)
        histtype: 'bar', 'step', 'stepfilled'
        save_path: đường dẫn lưu file
        show: hiển thị biểu đồ
    """
    HistogramConfig.apply_style(style)
    fig, ax = plt.subplots(figsize=figsize, dpi=dpi)

    color_list = colors or HistogramConfig.DEFAULTS['colors']

    for i, (name, data) in enumerate(data_dict.items()):
        color = color_list[i % len(color_list)]
        ax.hist(data, bins=bins, density=density,
                color=color, edgecolor='white', linewidth=0.8,
                alpha=alpha, histtype=histtype, label=name)

    if grid:
        ax.grid(True, axis=grid_axis, linestyle='--', alpha=0.5)

    if title:
        ax.set_title(title, fontsize=HistogramConfig.DEFAULTS['title_fontsize'],
                     fontweight='bold', pad=15)
    if xlabel:
        ax.set_xlabel(xlabel, fontsize=HistogramConfig.DEFAULTS['label_fontsize'], labelpad=10)
    if ylabel:
        ylabel_text = 'Mật độ' if density else 'Tần suất'
        ax.set_ylabel(ylabel_text,
                       fontsize=HistogramConfig.DEFAULTS['label_fontsize'], labelpad=10)

    ax.tick_params(axis='both', labelsize=HistogramConfig.DEFAULTS['tick_fontsize'])
    ax.legend(loc=legend_loc, fontsize=HistogramConfig.DEFAULTS['legend_fontsize'],
              frameon=True, edgecolor='gray')

    HistogramConfig.clean_spines(ax)
    plt.tight_layout()

    if save_path:
        fig.savefig(save_path, dpi=300, bbox_inches='tight', facecolor='white')

    if show:
        plt.show()

    return fig


# ============================================================
# STACKED / DODGE HISTOGRAMS
# ============================================================

def plot_stacked_histogram(
    data_dict: dict,
    bins: int = 20,
    title: str = '',
    xlabel: str = '',
    ylabel: str = 'Tần suất',
    colors: Optional[List[str]] = None,
    alpha: float = 0.85,
    density: bool = False,
    legend_loc: str = 'best',
    figsize: Tuple[int, int] = (12, 7),
    dpi: int = 150,
    style: Optional[str] = None,
    grid: bool = True,
    save_path: Optional[str] = None,
    show: bool = True
) -> plt.Figure:
    """
    Vẽ histogram stacked (chồng lên nhau).

    Args:
        save_path: đường dẫn lưu file
        show: hiển thị biểu đồ
    """
    HistogramConfig.apply_style(style)
    fig, ax = plt.subplots(figsize=figsize, dpi=dpi)

    color_list = colors or HistogramConfig.DEFAULTS['colors']
    names = list(data_dict.keys())
    data_arrays = [np.array(data).flatten() for data in data_dict.values()]

    x_min = min(d.min() for d in data_arrays)
    x_max = max(d.max() for d in data_arrays)
    bin_edges = np.linspace(x_min, x_max, bins + 1)
    bin_centers = (bin_edges[:-1] + bin_edges[1:]) / 2

    bottoms = np.zeros(len(bin_centers))

    for i, (name, data) in enumerate(data_dict.items()):
        hist_values, _ = np.histogram(data, bins=bin_edges, density=density)
        ax.bar(bin_centers, hist_values, width=bin_edges[1] - bin_edges[0],
               bottom=bottoms, label=name,
               color=color_list[i % len(color_list)],
               edgecolor='white', linewidth=0.5, alpha=alpha)
        bottoms += hist_values

    if grid:
        ax.grid(True, axis='y', linestyle='--', alpha=0.5)

    if title:
        ax.set_title(title, fontsize=HistogramConfig.DEFAULTS['title_fontsize'],
                     fontweight='bold', pad=15)
    if xlabel:
        ax.set_xlabel(xlabel, fontsize=HistogramConfig.DEFAULTS['label_fontsize'], labelpad=10)
    if ylabel:
        ylabel_text = 'Mật độ tích lũy' if density else 'Tần suất tích lũy'
        ax.set_ylabel(ylabel_text,
                       fontsize=HistogramConfig.DEFAULTS['label_fontsize'], labelpad=10)

    ax.tick_params(axis='both', labelsize=HistogramConfig.DEFAULTS['tick_fontsize'])
    ax.legend(loc=legend_loc, fontsize=HistogramConfig.DEFAULTS['legend_fontsize'],
              frameon=True, edgecolor='gray')

    HistogramConfig.clean_spines(ax)
    plt.tight_layout()

    if save_path:
        fig.savefig(save_path, dpi=300, bbox_inches='tight', facecolor='white')

    if show:
        plt.show()

    return fig


# ============================================================
# PANDAS WRAPPER
# ============================================================

def pandas_histogram(
    df: pd.DataFrame,
    column: Optional[str] = None,
    bins: int = 30,
    title: str = '',
    figsize: Tuple[int, int] = (10, 6),
    dpi: int = 150,
    style: Optional[str] = None,
    color: Optional[str] = None,
    alpha: float = 0.75,
    grid: bool = True,
    xlabel: Optional[str] = None,
    ylabel: Optional[str] = None,
    save_path: Optional[str] = None,
    show: bool = True
) -> plt.Figure:
    """
    Vẽ histogram sử dụng pandas Series/DataFrame.plot().

    Args:
        save_path: đường dẫn lưu file
        show: hiển thị biểu đồ
    """
    HistogramConfig.apply_style(style)

    ax = df.plot(kind='hist', bins=bins, figsize=figsize, dpi=dpi,
                 color=color, alpha=alpha, grid=grid,
                 title=title if title else None)

    if title:
        ax.set_title(title, fontsize=HistogramConfig.DEFAULTS['title_fontsize'],
                     fontweight='bold', pad=15)
    if xlabel:
        ax.set_xlabel(xlabel, fontsize=HistogramConfig.DEFAULTS['label_fontsize'])
    if ylabel:
        ax.set_ylabel(ylabel, fontsize=HistogramConfig.DEFAULTS['label_fontsize'])

    HistogramConfig.clean_spines(ax)
    plt.tight_layout()

    if save_path:
        ax.figure.savefig(save_path, dpi=300, bbox_inches='tight', facecolor='white')

    if show:
        plt.show()

    return ax.figure


# ============================================================
# USAGE EXAMPLES
# ============================================================

if __name__ == '__main__':
    np.random.seed(42)

    data_normal = np.random.normal(loc=50, scale=15, size=500)
    data_skewed = np.random.exponential(scale=30, size=500)
    data_bimodal = np.concatenate([np.random.normal(30, 8, 250),
                                    np.random.normal(70, 10, 250)])

    print("=== Histogram Examples ===\n")

    # 1. Basic histogram
    plot_histogram(
        data=data_normal, bins=30,
        title='Phân bố điểm thi',
        xlabel='Điểm số', ylabel='Số học sinh',
        color='#3498db',
        mean_line=True, median_line=True, kde=True,
        grid=True,
        show=False, save_path='charts/output/histogram_basic.png'
    )
    print("1. Basic histogram: charts/output/histogram_basic.png")

    # 2. Step histogram
    plot_histogram(
        data=data_skewed, bins=25,
        title='Phân bố thu nhập (lệch phải)',
        xlabel='Thu nhập (Triệu)', ylabel='Tần suất',
        color='#e74c3c', histtype='stepfilled',
        mean_line=True,
        grid=True,
        show=False, save_path='charts/output/histogram_step.png'
    )
    print("2. Step histogram: charts/output/histogram_step.png")

    # 3. Multiple histograms
    plot_multiple_histograms(
        data_dict={
            'Nhóm A (BTB)': data_normal,
            'Nhóm B (Kém)': data_skewed,
            'Nhóm C (Giỏi)': data_bimodal,
        },
        bins=20, alpha=0.6,
        title='So sánh phân bố điểm giữa các nhóm',
        xlabel='Điểm số', ylabel='Tần suất',
        histtype='stepfilled',
        legend_loc='upper right',
        grid=True,
        show=False, save_path='charts/output/histogram_multiple.png'
    )
    print("3. Multiple histograms: charts/output/histogram_multiple.png")
