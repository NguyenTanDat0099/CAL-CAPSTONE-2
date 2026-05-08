"""
Area Chart - Biểu đồ vùng
Prompts: charts/prompts/08_area_chart_prompt.md
"""
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np
from typing import Optional, List, Tuple, Union


class AreaConfig:
    """Cấu hình mặc định cho Area Chart."""

    DEFAULTS = {
        'figsize': (12, 7),
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
            plt.style.use(style or AreaConfig.DEFAULTS['style'])
        except Exception:
            pass

    @staticmethod
    def clean_spines(ax):
        for spine in ['top', 'right']:
            ax.spines[spine].set_visible(False)


# ============================================================
# SINGLE AREA CHART
# ============================================================

def plot_area(
    x: Union[pd.Series, np.ndarray, List],
    y: Union[pd.Series, np.ndarray, List],
    title: str = '',
    xlabel: str = '',
    ylabel: str = '',
    color: str = '#3498db',
    alpha: float = 0.7,
    linewidth: float = 2,
    linestyle: str = '-',
    baseline: Union[str, float] = 'zero',
    figsize: Tuple[int, int] = (12, 7),
    dpi: int = 150,
    style: Optional[str] = None,
    grid: bool = True,
    grid_linestyle: str = '--',
    grid_alpha: float = 0.5,
    fill_above: bool = True,
    xtick_rotation: int = 0,
    ytick_rotation: int = 0,
    xlim: Optional[Tuple[float, float]] = None,
    ylim: Optional[Tuple[float, float]] = None,
    hline: Optional[Tuple[float, str, str]] = None,
    save_path: Optional[str] = None,
    show: bool = True
) -> plt.Figure:
    """
    Vẽ area chart đơn (một vùng).

    Args:
        x, y: dữ liệu trục X và Y
        color: màu vùng tô
        alpha: độ trong suốt
        linewidth: độ dày đường viền
        baseline: 'zero', 'sym', hoặc giá trị số
        fill_above: True = tô phía trên baseline, False = tô phía dưới
        hline: tuple (value, color, linestyle) cho đường ngang
        save_path: đường dẫn lưu file
        show: hiển thị biểu đồ
    """
    AreaConfig.apply_style(style)
    fig, ax = plt.subplots(figsize=figsize, dpi=dpi)

    x_arr = np.array(x)
    y_arr = np.array(y)

    if baseline == 'zero':
        where = y_arr >= 0 if not fill_above else y_arr >= 0
        ax.fill_between(x_arr, y_arr, 0,
                        color=color, alpha=alpha, where=where)
        if not fill_above:
            ax.fill_between(x_arr, y_arr, 0,
                            color=color, alpha=alpha / 2, where=~where)
    elif baseline == 'sym':
        ax.fill_between(x_arr, y_arr, 0,
                        color=color, alpha=alpha, where=y_arr >= 0)
        ax.fill_between(x_arr, y_arr, 0,
                        color=color, alpha=alpha / 2, where=y_arr < 0)
    elif isinstance(baseline, (int, float)):
        ax.fill_between(x_arr, y_arr, baseline,
                        color=color, alpha=alpha)

    ax.plot(x_arr, y_arr, linewidth=linewidth, linestyle=linestyle,
            color=color)

    if grid:
        ax.grid(True, linestyle=grid_linestyle, alpha=grid_alpha)

    if hline:
        val, hcolor, hstyle = hline
        ax.axhline(y=val, color=hcolor, linestyle=hstyle, linewidth=1.5)

    if title:
        ax.set_title(title, fontsize=AreaConfig.DEFAULTS['title_fontsize'],
                     fontweight='bold', pad=15)
    if xlabel:
        ax.set_xlabel(xlabel, fontsize=AreaConfig.DEFAULTS['label_fontsize'], labelpad=10)
    if ylabel:
        ax.set_ylabel(ylabel, fontsize=AreaConfig.DEFAULTS['label_fontsize'], labelpad=10)

    ax.tick_params(axis='x', rotation=xtick_rotation,
                   labelsize=AreaConfig.DEFAULTS['tick_fontsize'])
    ax.tick_params(axis='y', rotation=ytick_rotation,
                   labelsize=AreaConfig.DEFAULTS['tick_fontsize'])

    if xlim:
        ax.set_xlim(xlim)
    if ylim:
        ax.set_ylim(ylim)

    AreaConfig.clean_spines(ax)
    plt.tight_layout()

    if save_path:
        fig.savefig(save_path, dpi=300, bbox_inches='tight', facecolor='white')

    if show:
        plt.show()

    return fig


# ============================================================
# STACKED AREA CHART
# ============================================================

def plot_stacked_area(
    df: pd.DataFrame,
    x: str,
    columns: List[str],
    title: str = '',
    xlabel: str = '',
    ylabel: str = '',
    colors: Optional[List[str]] = None,
    colormap: Optional[str] = None,
    alpha: float = 0.85,
    linewidth: float = 1.5,
    baseline: str = 'zero',
    figsize: Tuple[int, int] = (14, 8),
    dpi: int = 150,
    style: Optional[str] = None,
    grid: bool = True,
    grid_linestyle: str = '--',
    grid_alpha: float = 0.5,
    legend_loc: str = 'best',
    xtick_rotation: int = 0,
    annotate: bool = True,
    annotate_cols: Optional[List[str]] = None,
    annotate_fontsize: int = 9,
    xlim: Optional[Tuple[float, float]] = None,
    ylim: Optional[Tuple[float, float]] = None,
    save_path: Optional[str] = None,
    show: bool = True
) -> plt.Figure:
    """
    Vẽ stacked area chart (các vùng chồng lên nhau).

    Args:
        df: DataFrame chứa dữ liệu
        x: tên cột trục X
        columns: danh sách cột cần vẽ (thứ tự từ dưới lên trên)
        colors: danh sách màu
        colormap: tên colormap thay vì colors
        alpha: độ trong suốt
        baseline: 'zero', 'sym', hoặc giá trị số
        annotate: hiển thị giá trị
        annotate_cols: cột nào cần annotate (None = tất cả)
        save_path: đường dẫn lưu file
        show: hiển thị biểu đồ
    """
    AreaConfig.apply_style(style)
    fig, ax = plt.subplots(figsize=figsize, dpi=dpi)

    x_arr = df[x].values
    color_list = colors or AreaConfig.DEFAULTS['colors']

    if colormap:
        from matplotlib import cm
        cmap = cm.get_cmap(colormap)
        n_colors = len(columns)
        color_list = [cmap(i / max(n_colors - 1, 1)) for i in range(n_colors)]

    bottoms = np.zeros(len(x_arr))

    for i, col in enumerate(columns):
        values = df[col].values
        color = color_list[i % len(color_list)]

        ax.fill_between(x_arr, bottoms, bottoms + values,
                        color=color, alpha=alpha, label=col,
                        linewidth=linewidth, edgecolor='white', edgealpha=0.5)
        bottoms = bottoms + values

        if annotate and (annotate_cols is None or col in annotate_cols):
            ann_indices = np.arange(0, len(x_arr), max(1, len(x_arr) // 6))
            for idx in ann_indices:
                if values[idx] > 5:
                    ax.annotate(f'{values[idx]:.0f}',
                                xy=(x_arr[idx], bottoms[idx] - values[idx] / 2),
                                ha='center', va='center',
                                fontsize=annotate_fontsize,
                                color='white', fontweight='bold',
                                rotation=90 if len(columns) > 2 else 0)

    if grid:
        ax.grid(True, linestyle=grid_linestyle, alpha=grid_alpha)

    if title:
        ax.set_title(title, fontsize=AreaConfig.DEFAULTS['title_fontsize'],
                     fontweight='bold', pad=15)
    if xlabel:
        ax.set_xlabel(xlabel, fontsize=AreaConfig.DEFAULTS['label_fontsize'], labelpad=10)
    if ylabel:
        ax.set_ylabel(ylabel, fontsize=AreaConfig.DEFAULTS['label_fontsize'], labelpad=10)

    ax.tick_params(axis='x', rotation=xtick_rotation,
                   labelsize=AreaConfig.DEFAULTS['tick_fontsize'])
    ax.tick_params(axis='y', labelsize=AreaConfig.DEFAULTS['tick_fontsize'])

    ax.legend(loc=legend_loc, fontsize=AreaConfig.DEFAULTS['legend_fontsize'],
              frameon=True, edgecolor='gray')

    if xlim:
        ax.set_xlim(xlim)
    if ylim:
        ax.set_ylim(ylim)

    AreaConfig.clean_spines(ax)
    plt.tight_layout()

    if save_path:
        fig.savefig(save_path, dpi=300, bbox_inches='tight', facecolor='white')

    if show:
        plt.show()

    return fig


# ============================================================
# OVERLAPPING AREA CHART (Non-stacked)
# ============================================================

def plot_overlapping_area(
    df: pd.DataFrame,
    x: str,
    columns: List[str],
    title: str = '',
    xlabel: str = '',
    ylabel: str = '',
    colors: Optional[List[str]] = None,
    alpha: float = 0.4,
    linewidth: float = 2,
    figsize: Tuple[int, int] = (14, 8),
    dpi: int = 150,
    style: Optional[str] = None,
    grid: bool = True,
    grid_linestyle: str = '--',
    grid_alpha: float = 0.5,
    legend_loc: str = 'best',
    xtick_rotation: int = 0,
    xlim: Optional[Tuple[float, float]] = None,
    ylim: Optional[Tuple[float, float]] = None,
    save_path: Optional[str] = None,
    show: bool = True
) -> plt.Figure:
    """
    Vẽ overlapping area chart (các vùng đè lên nhau, không stacked).

    Args:
        save_path: đường dẫn lưu file
        show: hiển thị biểu đồ
    """
    AreaConfig.apply_style(style)
    fig, ax = plt.subplots(figsize=figsize, dpi=dpi)

    x_arr = df[x].values
    color_list = colors or AreaConfig.DEFAULTS['colors']

    for i, col in enumerate(columns):
        color = color_list[i % len(color_list)]
        ax.fill_between(x_arr, df[col].values, alpha=alpha, color=color,
                        label=col)
        ax.plot(x_arr, df[col].values, linewidth=linewidth, color=color)

    if grid:
        ax.grid(True, linestyle=grid_linestyle, alpha=grid_alpha)

    if title:
        ax.set_title(title, fontsize=AreaConfig.DEFAULTS['title_fontsize'],
                     fontweight='bold', pad=15)
    if xlabel:
        ax.set_xlabel(xlabel, fontsize=AreaConfig.DEFAULTS['label_fontsize'], labelpad=10)
    if ylabel:
        ax.set_ylabel(ylabel, fontsize=AreaConfig.DEFAULTS['label_fontsize'], labelpad=10)

    ax.tick_params(axis='x', rotation=xtick_rotation,
                   labelsize=AreaConfig.DEFAULTS['tick_fontsize'])
    ax.tick_params(axis='y', labelsize=AreaConfig.DEFAULTS['tick_fontsize'])

    ax.legend(loc=legend_loc, fontsize=AreaConfig.DEFAULTS['legend_fontsize'],
              frameon=True, edgecolor='gray')

    if xlim:
        ax.set_xlim(xlim)
    if ylim:
        ax.set_ylim(ylim)

    AreaConfig.clean_spines(ax)
    plt.tight_layout()

    if save_path:
        fig.savefig(save_path, dpi=300, bbox_inches='tight', facecolor='white')

    if show:
        plt.show()

    return fig


# ============================================================
# PANDAS WRAPPER
# ============================================================

def pandas_area_chart(
    df: pd.DataFrame,
    x: Optional[str] = None,
    y: Optional[Union[str, List[str]]] = None,
    title: str = '',
    figsize: Tuple[int, int] = (12, 7),
    dpi: int = 150,
    style: Optional[str] = None,
    stacked: bool = True,
    alpha: float = 0.7,
    colormap: Optional[str] = None,
    grid: bool = True,
    rot: int = 0,
    legend: Union[bool, str] = True,
    legend_loc: str = 'best',
    xlabel: Optional[str] = None,
    ylabel: Optional[str] = None,
    save_path: Optional[str] = None,
    show: bool = True
) -> plt.Figure:
    """
    Vẽ area chart sử dụng pandas DataFrame.plot().

    Args:
        save_path: đường dẫn lưu file
        show: hiển thị biểu đồ
    """
    AreaConfig.apply_style(style)

    ax = df.plot(kind='area', figsize=figsize, dpi=dpi,
                 x=x, y=y, stacked=stacked, alpha=alpha,
                 colormap=colormap, grid=grid, rot=rot,
                 legend=legend, title=title if title else None)

    if title:
        ax.set_title(title, fontsize=AreaConfig.DEFAULTS['title_fontsize'],
                     fontweight='bold', pad=15)
    if xlabel:
        ax.set_xlabel(xlabel, fontsize=AreaConfig.DEFAULTS['label_fontsize'])
    if ylabel:
        ax.set_ylabel(ylabel, fontsize=AreaConfig.DEFAULTS['label_fontsize'])

    if isinstance(legend, str) and legend == 'reverse':
        handles, labels = ax.get_legend_handles_labels()
        ax.legend(handles[::-1], labels[::-1], loc=legend_loc,
                  fontsize=AreaConfig.DEFAULTS['legend_fontsize'])
    elif legend:
        ax.legend(loc=legend_loc, fontsize=AreaConfig.DEFAULTS['legend_fontsize'])

    AreaConfig.clean_spines(ax)
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
    months = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12']
    df = pd.DataFrame({
        'Tháng': months,
        'Sản phẩm A': [120, 135, 110, 160, 175, 190, 185, 200, 210, 195, 220, 250],
        'Sản phẩm B': [80,  85,  90,  95, 100, 105, 110, 115, 120, 125, 130, 140],
        'Sản phẩm C': [50,  55,  60,  65,  70,  75,  78,  80,  85,  88,  90,  95],
        'Dịch vụ':   [30,  35,  40,  45,  50,  55,  58,  60,  62,  65,  68,  70],
    })

    print("=== Area Chart Examples ===\n")

    # 1. Single area
    plot_area(
        x=months, y=df['Sản phẩm A'],
        title='Doanh thu Sản phẩm A theo tháng',
        xlabel='Tháng', ylabel='Doanh thu (Triệu)',
        color='#3498db', alpha=0.6,
        grid=True,
        show=False, save_path='charts/output/area_single.png'
    )
    print("1. Single area: charts/output/area_single.png")

    # 2. Stacked area
    plot_stacked_area(
        df=df, x='Tháng',
        columns=['Sản phẩm A', 'Sản phẩm B', 'Sản phẩm C', 'Dịch vụ'],
        title='Cơ cấu doanh thu theo tháng (Stacked)',
        xlabel='Tháng', ylabel='Doanh thu (Triệu)',
        colormap='Blues',
        alpha=0.85,
        grid=True,
        annotate=True,
        show=False, save_path='charts/output/area_stacked.png'
    )
    print("2. Stacked area: charts/output/area_stacked.png")

    # 3. Overlapping area
    plot_overlapping_area(
        df=df, x='Tháng',
        columns=['Sản phẩm A', 'Sản phẩm B', 'Sản phẩm C', 'Dịch vụ'],
        title='So sánh doanh thu các sản phẩm (Overlapping)',
        xlabel='Tháng', ylabel='Doanh thu (Triệu)',
        colors=['#3498db', '#e74c3c', '#2ecc71', '#f39c12'],
        alpha=0.4, linewidth=2,
        grid=True,
        show=False, save_path='charts/output/area_overlapping.png'
    )
    print("3. Overlapping area: charts/output/area_overlapping.png")

    # 4. Pandas wrapper
    pandas_area_chart(
        df=df.set_index('Tháng'),
        title='Doanh thu theo tháng (Pandas)',
        stacked=True,
        colormap='Set2',
        alpha=0.7,
        grid=True,
        show=False, save_path='charts/output/area_pandas.png'
    )
    print("4. Pandas wrapper: charts/output/area_pandas.png")
