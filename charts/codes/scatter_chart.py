"""
Scatter Plot - Biểu đồ phân tán
Prompts: charts/prompts/03_scatter_chart_prompt.md
"""
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np
from typing import Optional, List, Tuple, Union


class ScatterConfig:
    """Cấu hình mặc định cho Scatter Plot."""

    DEFAULTS = {
        'figsize': (10, 8),
        'dpi': 150,
        'style': 'seaborn-v0_8-whitegrid',
        'colors': ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6'],
        'colormaps': ['viridis', 'plasma', 'coolwarm', 'RdYlGn', 'Blues', 'YlOrRd'],
        'title_fontsize': 18,
        'label_fontsize': 13,
        'tick_fontsize': 11,
        'legend_fontsize': 12,
    }

    @staticmethod
    def apply_style(style: Optional[str] = None):
        try:
            plt.style.use(style or ScatterConfig.DEFAULTS['style'])
        except Exception:
            pass

    @staticmethod
    def clean_spines(ax):
        for spine in ['top', 'right']:
            ax.spines[spine].set_visible(False)


# ============================================================
# BASIC SCATTER PLOT
# ============================================================

def plot_scatter(
    x: Union[pd.Series, np.ndarray, List],
    y: Union[pd.Series, np.ndarray, List],
    c: Optional[Union[pd.Series, np.ndarray, List, str]] = None,
    s: Optional[Union[pd.Series, np.ndarray, List, float]] = None,
    title: str = '',
    xlabel: str = '',
    ylabel: str = '',
    marker: str = 'o',
    color: str = '#3498db',
    cmap: str = 'viridis',
    vmin: Optional[float] = None,
    vmax: Optional[float] = None,
    alpha: float = 0.7,
    edgecolors: str = 'black',
    linewidths: float = 1.0,
    label: Optional[str] = None,
    figsize: Tuple[int, int] = (10, 8),
    dpi: int = 150,
    style: Optional[str] = None,
    grid: bool = True,
    colorbar: bool = True,
    cbar_label: str = '',
    cbar_fontsize: int = 11,
    xlim: Optional[Tuple[float, float]] = None,
    ylim: Optional[Tuple[float, float]] = None,
    regression: bool = False,
    regression_color: str = '#e74c3c',
    regression_linewidth: float = 2,
    save_path: Optional[str] = None,
    show: bool = True
) -> plt.Figure:
    """
    Vẽ scatter plot.

    Args:
        x, y: tọa độ điểm
        c: màu (một màu hoặc array để map theo colormap)
        s: kích thước điểm (scalar hoặc array)
        cmap: tên colormap khi c là array
        vmin, vmax: giới hạn màu
        colorbar: hiển thị thanh màu
        cbar_label: nhãn thanh màu
        regression: vẽ đường hồi quy tuyến tính
        save_path: đường dẫn lưu file
        show: hiển thị biểu đồ
    """
    ScatterConfig.apply_style(style)
    fig, ax = plt.subplots(figsize=figsize, dpi=dpi)

    scatter = ax.scatter(x, y, c=c, s=s, cmap=cmap,
                         color=color if c is None else None,
                         vmin=vmin, vmax=vmax,
                         marker=marker, alpha=alpha,
                         edgecolors=edgecolors, linewidths=linewidths,
                         label=label)

    if grid:
        ax.grid(True, linestyle='--', alpha=0.5)

    if colorbar and c is not None:
        cbar = plt.colorbar(scatter, ax=ax, shrink=0.8)
        cbar.set_label(cbar_label, fontsize=cbar_fontsize)

    if regression:
        x_arr = np.array(x)
        y_arr = np.array(y)
        valid = ~(np.isnan(x_arr) | np.isnan(y_arr))
        if valid.sum() > 1:
            coeffs = np.polyfit(x_arr[valid], y_arr[valid], 1)
            poly = np.poly1d(coeffs)
            x_line = np.linspace(x_arr[valid].min(), x_arr[valid].max(), 100)
            ax.plot(x_line, poly(x_line), color=regression_color,
                    linewidth=regression_linewidth, linestyle='--',
                    label=f'Regression (y={coeffs[0]:.2f}x+{coeffs[1]:.2f})')
            ax.legend(loc='best', fontsize=ScatterConfig.DEFAULTS['legend_fontsize'])

    if title:
        ax.set_title(title, fontsize=ScatterConfig.DEFAULTS['title_fontsize'],
                     fontweight='bold', pad=15)
    if xlabel:
        ax.set_xlabel(xlabel, fontsize=ScatterConfig.DEFAULTS['label_fontsize'], labelpad=10)
    if ylabel:
        ax.set_ylabel(ylabel, fontsize=ScatterConfig.DEFAULTS['label_fontsize'], labelpad=10)

    ax.tick_params(axis='both', labelsize=ScatterConfig.DEFAULTS['tick_fontsize'])

    if xlim:
        ax.set_xlim(xlim)
    if ylim:
        ax.set_ylim(ylim)

    ScatterConfig.clean_spines(ax)
    plt.tight_layout()

    if save_path:
        fig.savefig(save_path, dpi=300, bbox_inches='tight', facecolor='white')

    if show:
        plt.show()

    return fig


# ============================================================
# MULTIPLE SCATTER GROUPS
# ============================================================

def plot_scatter_groups(
    df: pd.DataFrame,
    x_col: str,
    y_col: str,
    group_col: str,
    colors: Optional[List[str]] = None,
    markers: Optional[List[str]] = None,
    sizes: float = 80,
    title: str = '',
    xlabel: str = '',
    ylabel: str = '',
    alpha: float = 0.7,
    edgecolors: str = 'black',
    linewidths: float = 1.0,
    figsize: Tuple[int, int] = (12, 8),
    dpi: int = 150,
    style: Optional[str] = None,
    grid: bool = True,
    legend_loc: str = 'best',
    xlim: Optional[Tuple[float, float]] = None,
    ylim: Optional[Tuple[float, float]] = None,
    save_path: Optional[str] = None,
    show: bool = True
) -> plt.Figure:
    """
    Vẽ scatter plot với nhiều nhóm (mỗi nhóm một màu/marker).

    Args:
        df: DataFrame chứa dữ liệu
        x_col, y_col: tên cột tọa độ
        group_col: tên cột phân nhóm
        colors: danh sách màu cho mỗi nhóm
        markers: danh sách marker cho mỗi nhóm
        save_path: đường dẫn lưu file
        show: hiển thị biểu đồ
    """
    ScatterConfig.apply_style(style)
    fig, ax = plt.subplots(figsize=figsize, dpi=dpi)

    color_list = colors or ScatterConfig.DEFAULTS['colors']
    marker_list = markers or ['o', 's', '^', 'D', 'P', '*', 'X', 'd']

    groups = df[group_col].unique()

    for i, group in enumerate(groups):
        mask = df[group_col] == group
        color = color_list[i % len(color_list)]
        marker = marker_list[i % len(marker_list)]

        ax.scatter(df.loc[mask, x_col], df.loc[mask, y_col],
                   c=color, marker=marker, s=sizes,
                   alpha=alpha, edgecolors=edgecolors,
                   linewidths=linewidths, label=group)

    if grid:
        ax.grid(True, linestyle='--', alpha=0.5)

    if title:
        ax.set_title(title, fontsize=ScatterConfig.DEFAULTS['title_fontsize'],
                     fontweight='bold', pad=15)
    if xlabel:
        ax.set_xlabel(xlabel, fontsize=ScatterConfig.DEFAULTS['label_fontsize'], labelpad=10)
    if ylabel:
        ax.set_ylabel(ylabel, fontsize=ScatterConfig.DEFAULTS['label_fontsize'], labelpad=10)

    ax.tick_params(axis='both', labelsize=ScatterConfig.DEFAULTS['tick_fontsize'])
    ax.legend(loc=legend_loc, fontsize=ScatterConfig.DEFAULTS['legend_fontsize'],
              frameon=True, edgecolor='gray', title=group_col)

    if xlim:
        ax.set_xlim(xlim)
    if ylim:
        ax.set_ylim(ylim)

    ScatterConfig.clean_spines(ax)
    plt.tight_layout()

    if save_path:
        fig.savefig(save_path, dpi=300, bbox_inches='tight', facecolor='white')

    if show:
        plt.show()

    return fig


# ============================================================
# BUBBLE CHART (Scatter with size encoding)
# ============================================================

def plot_bubble(
    x: Union[pd.Series, np.ndarray, List],
    y: Union[pd.Series, np.ndarray, List],
    size: Union[pd.Series, np.ndarray, List],
    c: Optional[Union[pd.Series, np.ndarray, List, str]] = None,
    title: str = '',
    xlabel: str = '',
    ylabel: str = '',
    cmap: str = 'viridis',
    vmin: Optional[float] = None,
    vmax: Optional[float] = None,
    size_scale: float = 1.0,
    alpha: float = 0.6,
    edgecolors: str = 'white',
    linewidths: float = 1.0,
    colorbar: bool = True,
    cbar_label: str = '',
    figsize: Tuple[int, int] = (12, 8),
    dpi: int = 150,
    style: Optional[str] = None,
    grid: bool = True,
    xlim: Optional[Tuple[float, float]] = None,
    ylim: Optional[Tuple[float, float]] = None,
    save_path: Optional[str] = None,
    show: bool = True
) -> plt.Figure:
    """
    Vẽ bubble chart (scatter plot với kích thước mã hóa biến thứ 3).

    Args:
        size: kích thước bong bóng (array)
        size_scale: hệ số scale cho kích thước
        c: màu (một màu hoặc array)
        save_path: đường dẫn lưu file
        show: hiển thị biểu đồ
    """
    ScatterConfig.apply_style(style)
    fig, ax = plt.subplots(figsize=figsize, dpi=dpi)

    s_arr = np.array(size) * size_scale

    scatter = ax.scatter(x, y, s=s_arr, c=c, cmap=cmap,
                         vmin=vmin, vmax=vmax,
                         alpha=alpha, edgecolors=edgecolors,
                         linewidths=linewidths)

    if grid:
        ax.grid(True, linestyle='--', alpha=0.5)

    if colorbar and c is not None:
        cbar = plt.colorbar(scatter, ax=ax, shrink=0.8)
        if cbar_label:
            cbar.set_label(cbar_label, fontsize=ScatterConfig.DEFAULTS['label_fontsize'])

    if title:
        ax.set_title(title, fontsize=ScatterConfig.DEFAULTS['title_fontsize'],
                     fontweight='bold', pad=15)
    if xlabel:
        ax.set_xlabel(xlabel, fontsize=ScatterConfig.DEFAULTS['label_fontsize'], labelpad=10)
    if ylabel:
        ax.set_ylabel(ylabel, fontsize=ScatterConfig.DEFAULTS['label_fontsize'], labelpad=10)

    ax.tick_params(axis='both', labelsize=ScatterConfig.DEFAULTS['tick_fontsize'])

    if xlim:
        ax.set_xlim(xlim)
    if ylim:
        ax.set_ylim(ylim)

    ScatterConfig.clean_spines(ax)
    plt.tight_layout()

    if save_path:
        fig.savefig(save_path, dpi=300, bbox_inches='tight', facecolor='white')

    if show:
        plt.show()

    return fig


# ============================================================
# PANDAS WRAPPER
# ============================================================

def pandas_scatter(
    df: pd.DataFrame,
    x: str,
    y: str,
    c: Optional[Union[str, List[str]]] = None,
    s: Optional[Union[str, float]] = None,
    cmap: str = 'viridis',
    title: str = '',
    figsize: Tuple[int, int] = (10, 8),
    dpi: int = 150,
    style: Optional[str] = None,
    alpha: float = 0.7,
    grid: bool = True,
    colorbar: bool = True,
    xlabel: Optional[str] = None,
    ylabel: Optional[str] = None,
    save_path: Optional[str] = None,
    show: bool = True
) -> plt.Figure:
    """
    Vẽ scatter plot sử dụng pandas DataFrame.plot().

    Args:
        save_path: đường dẫn lưu file
        show: hiển thị biểu đồ
    """
    ScatterConfig.apply_style(style)

    ax = df.plot(kind='scatter', x=x, y=y, c=c, s=s, cmap=cmap,
                 figsize=figsize, dpi=dpi, alpha=alpha, grid=grid)

    if title:
        ax.set_title(title, fontsize=ScatterConfig.DEFAULTS['title_fontsize'],
                     fontweight='bold', pad=15)
    if xlabel:
        ax.set_xlabel(xlabel, fontsize=ScatterConfig.DEFAULTS['label_fontsize'])
    if ylabel:
        ax.set_ylabel(ylabel, fontsize=ScatterConfig.DEFAULTS['label_fontsize'])

    ScatterConfig.clean_spines(ax)
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

    # Sample data
    df = pd.DataFrame({
        'Tuổi': np.random.randint(20, 60, 100),
        'Thu nhập': np.random.randint(10, 100, 100) * 10,
        'Chi tiêu': np.random.randint(5, 80, 100) * 10,
        'Điểm tín dụng': np.random.randint(300, 850, 100),
        'Nhóm tuổi': pd.cut(np.random.randint(20, 60, 100),
                            bins=[20, 30, 40, 50, 60],
                            labels=['20-30', '30-40', '40-50', '50-60']),
    })

    print("=== Scatter Plot Examples ===\n")

    # 1. Basic scatter
    plot_scatter(
        x=df['Tuổi'], y=df['Thu nhập'],
        c=df['Điểm tín dụng'], cmap='viridis',
        s=100, alpha=0.7,
        title='Tuổi vs Thu nhập (màu theo điểm tín dụng)',
        xlabel='Tuổi', ylabel='Thu nhập (VNĐ)',
        colorbar=True, cbar_label='Điểm tín dụng',
        regression=True,
        show=False, save_path='charts/output/scatter_basic.png'
    )
    print("1. Basic scatter: charts/output/scatter_basic.png")

    # 2. Scatter groups
    plot_scatter_groups(
        df=df, x_col='Tuổi', y_col='Thu nhập', group_col='Nhóm tuổi',
        title='Thu nhập theo nhóm tuổi',
        xlabel='Tuổi', ylabel='Thu nhập (VNĐ)',
        sizes=80, alpha=0.7,
        grid=True,
        show=False, save_path='charts/output/scatter_groups.png'
    )
    print("2. Scatter groups: charts/output/scatter_groups.png")

    # 3. Bubble chart
    plot_bubble(
        x=df['Chi tiêu'], y=df['Thu nhập'],
        size=df['Điểm tín dụng'],
        c=df['Tuổi'], cmap='plasma',
        title='Chi tiêu vs Thu nhập (size=Điểm tín dụng, color=Tuổi)',
        xlabel='Chi tiêu (VNĐ)', ylabel='Thu nhập (VNĐ)',
        colorbar=True, cbar_label='Tuổi',
        size_scale=0.1, alpha=0.6,
        show=False, save_path='charts/output/scatter_bubble.png'
    )
    print("3. Bubble chart: charts/output/scatter_bubble.png")
