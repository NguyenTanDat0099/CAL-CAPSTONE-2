"""
Box Plot - Biểu đồ hộp
Prompts: charts/prompts/05_box_chart_prompt.md
"""
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np
from typing import Optional, List, Tuple, Union


class BoxConfig:
    """Cấu hình mặc định cho Box Plot."""

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
            plt.style.use(style or BoxConfig.DEFAULTS['style'])
        except Exception:
            pass

    @staticmethod
    def clean_spines(ax):
        for spine in ['top', 'right']:
            ax.spines[spine].set_visible(False)


# ============================================================
# BASIC BOX PLOT
# ============================================================

def plot_box(
    data: Union[List, pd.DataFrame, np.ndarray],
    labels: Optional[List[str]] = None,
    title: str = '',
    xlabel: str = '',
    ylabel: str = '',
    orientation: str = 'vertical',
    patch_artist: bool = True,
    colors: Optional[Union[str, List[str]]] = None,
    color: str = '#3498db',
    alpha: float = 0.7,
    showmeans: bool = True,
    meanline: bool = False,
    showfliers: bool = True,
    notch: bool = False,
    median_color: str = '#e74c3c',
    median_linewidth: float = 2,
    whisker_linestyle: str = '-',
    whisker_linewidth: float = 1.5,
    cap_linewidth: float = 1.5,
    flier_marker: str = 'o',
    flier_size: float = 8,
    flier_color: str = '#e74c3c',
    figsize: Tuple[int, int] = (12, 7),
    dpi: int = 150,
    style: Optional[str] = None,
    grid: bool = True,
    grid_axis: str = 'y',
    xlim: Optional[Tuple[float, float]] = None,
    ylim: Optional[Tuple[float, float]] = None,
    save_path: Optional[str] = None,
    show: bool = True
) -> plt.Figure:
    """
    Vẽ box plot (một hoặc nhiều boxes).

    Args:
        data: list các arrays hoặc DataFrame
        labels: nhãn cho mỗi box
        orientation: 'vertical' hoặc 'horizontal'
        patch_artist: True = tô màu boxes
        colors: màu đơn hoặc danh sách màu
        showmeans: hiển thị mean
        meanline: True = mean là đường kẻ, False = marker
        showfliers: hiển thị outliers
        notch: vẽ khấc ở median
        save_path: đường dẫn lưu file
        show: hiển thị biểu đồ
    """
    BoxConfig.apply_style(style)
    fig, ax = plt.subplots(figsize=figsize, dpi=dpi)

    vert = orientation == 'vertical'
    color_list = [colors] if isinstance(colors, str) else (colors or [color])

    bp = ax.boxplot(data, labels=labels, patch_artist=patch_artist,
                    showmeans=showmeans, meanline=meanline,
                    showfliers=showfliers, notch=notch, vert=vert,
                    medianprops=dict(color=median_color, linewidth=median_linewidth),
                    meanprops=dict(color='#2ecc71', linewidth=2,
                                  marker='D', markerfacecolor='#2ecc71',
                                  markersize=6) if not meanline else dict(),
                    whiskerprops=dict(color='gray', linestyle=whisker_linestyle,
                                      linewidth=whisker_linewidth),
                    capprops=dict(color='gray', linewidth=cap_linewidth),
                    flierprops=dict(marker=flier_marker, markersize=flier_size,
                                    markerfacecolor=flier_color,
                                    markeredgecolor='black', alpha=0.6),
                    widths=0.6)

    if patch_artist:
        for i, patch in enumerate(bp['boxes']):
            box_color = color_list[i % len(color_list)]
            patch.set_facecolor(box_color)
            patch.set_alpha(alpha)
            patch.set_edgecolor('gray')
            patch.set_linewidth(1.5)

    if grid:
        ax.grid(True, axis=grid_axis, linestyle='--', alpha=0.5)

    if title:
        ax.set_title(title, fontsize=BoxConfig.DEFAULTS['title_fontsize'],
                     fontweight='bold', pad=15)
    if xlabel:
        ax.set_xlabel(xlabel, fontsize=BoxConfig.DEFAULTS['label_fontsize'], labelpad=10)
    if ylabel:
        ax.set_ylabel(ylabel, fontsize=BoxConfig.DEFAULTS['label_fontsize'], labelpad=10)

    ax.tick_params(axis='both', labelsize=BoxConfig.DEFAULTS['tick_fontsize'])

    if xlim:
        ax.set_xlim(xlim)
    if ylim:
        ax.set_ylim(ylim)

    BoxConfig.clean_spines(ax)
    plt.tight_layout()

    if save_path:
        fig.savefig(save_path, dpi=300, bbox_inches='tight', facecolor='white')

    if show:
        plt.show()

    return fig


# ============================================================
# GROUPED BOX PLOT (from DataFrame)
# ============================================================

def plot_grouped_box(
    df: pd.DataFrame,
    x_col: str,
    y_col: str,
    hue_col: Optional[str] = None,
    title: str = '',
    xlabel: str = '',
    ylabel: str = '',
    colors: Optional[List[str]] = None,
    palette: Optional[str] = 'Set2',
    alpha: float = 0.7,
    showmeans: bool = True,
    meanline: bool = False,
    figsize: Tuple[int, int] = (14, 7),
    dpi: int = 150,
    style: Optional[str] = None,
    grid: bool = True,
    legend_loc: str = 'best',
    save_path: Optional[str] = None,
    show: bool = True
) -> plt.Figure:
    """
    Vẽ grouped box plot từ DataFrame (nhiều boxes cho mỗi nhóm).

    Args:
        df: DataFrame chứa dữ liệu
        x_col: tên cột trục X (categories chính)
        y_col: tên cột trục Y (giá trị)
        hue_col: tên cột phân nhóm phụ
        palette: tên color palette
        save_path: đường dẫn lưu file
        show: hiển thị biểu đồ
    """
    try:
        import seaborn as sns
        has_seaborn = True
    except ImportError:
        has_seaborn = False

    BoxConfig.apply_style(style)

    if has_seaborn and hue_col:
        fig, ax = plt.subplots(figsize=figsize, dpi=dpi)
        sns.boxplot(data=df, x=x_col, y=y_col, hue=hue_col,
                    palette=palette, ax=ax, showmeans=showmeans,
                    meanline=meanline, alpha=alpha)
        if legend_loc != 'best':
            ax.legend(loc=legend_loc, fontsize=BoxConfig.DEFAULTS['legend_fontsize'])
    elif has_seaborn:
        fig, ax = plt.subplots(figsize=figsize, dpi=dpi)
        sns.boxplot(data=df, x=x_col, y=y_col,
                    palette=palette, ax=ax, showmeans=showmeans,
                    meanline=meanline, alpha=alpha)
    else:
        fig, ax = plt.subplots(figsize=figsize, dpi=dpi)
        groups = df[x_col].unique()
        color_list = colors or BoxConfig.DEFAULTS['colors']
        data_list = [df.loc[df[x_col] == g, y_col].values for g in groups]
        bp = ax.boxplot(data_list, labels=groups, patch_artist=True,
                        showmeans=showmeans, meanline=meanline, vert=True,
                        medianprops=dict(color='#e74c3c', linewidth=2),
                        meanprops=dict(color='#2ecc71', linewidth=2) if meanline else dict(),
                        widths=0.6)
        for i, patch in enumerate(bp['boxes']):
            patch.set_facecolor(color_list[i % len(color_list)])
            patch.set_alpha(alpha)
            patch.set_edgecolor('gray')

    if grid:
        ax.grid(True, axis='y', linestyle='--', alpha=0.5)

    if title:
        ax.set_title(title, fontsize=BoxConfig.DEFAULTS['title_fontsize'],
                     fontweight='bold', pad=15)
    if xlabel:
        ax.set_xlabel(xlabel, fontsize=BoxConfig.DEFAULTS['label_fontsize'], labelpad=10)
    if ylabel:
        ax.set_ylabel(ylabel, fontsize=BoxConfig.DEFAULTS['label_fontsize'], labelpad=10)

    ax.tick_params(axis='both', labelsize=BoxConfig.DEFAULTS['tick_fontsize'])
    BoxConfig.clean_spines(ax)
    plt.tight_layout()

    if save_path:
        fig.savefig(save_path, dpi=300, bbox_inches='tight', facecolor='white')

    if show:
        plt.show()

    return fig


# ============================================================
# HORIZONTAL BOX PLOT
# ============================================================

def plot_horizontal_box(
    data: Union[List, np.ndarray],
    labels: Optional[List[str]] = None,
    title: str = '',
    xlabel: str = '',
    ylabel: str = '',
    colors: Optional[List[str]] = None,
    color: str = '#3498db',
    alpha: float = 0.7,
    showmeans: bool = True,
    showfliers: bool = True,
    figsize: Tuple[int, int] = (10, 8),
    dpi: int = 150,
    style: Optional[str] = None,
    grid: bool = True,
    save_path: Optional[str] = None,
    show: bool = True
) -> plt.Figure:
    """
    Vẽ box plot ngang.

    Args:
        save_path: đường dẫn lưu file
        show: hiển thị biểu đồ
    """
    return plot_box(
        data=data, labels=labels,
        orientation='horizontal',
        title=title, xlabel=ylabel, ylabel=xlabel,
        colors=colors, color=color, alpha=alpha,
        showmeans=showmeans, showfliers=showfliers,
        figsize=figsize, dpi=dpi, style=style,
        grid=grid, grid_axis='x',
        save_path=save_path, show=show
    )


# ============================================================
# PANDAS WRAPPER
# ============================================================

def pandas_box(
    df: pd.DataFrame,
    column: Optional[Union[str, List[str]]] = None,
    by: Optional[str] = None,
    title: str = '',
    figsize: Tuple[int, int] = (12, 7),
    dpi: int = 150,
    style: Optional[str] = None,
    grid: bool = True,
    patch_artist: bool = True,
    xlabel: Optional[str] = None,
    ylabel: Optional[str] = None,
    save_path: Optional[str] = None,
    show: bool = True
) -> plt.Figure:
    """
    Vẽ box plot sử dụng pandas DataFrame.boxplot().

    Args:
        save_path: đường dẫn lưu file
        show: hiển thị biểu đồ
    """
    BoxConfig.apply_style(style)

    ax = df.boxplot(column=column, by=by, figsize=figsize, dpi=dpi,
                    grid=grid, patch_artist=patch_artist)

    if title:
        ax.set_title(title, fontsize=BoxConfig.DEFAULTS['title_fontsize'],
                     fontweight='bold', pad=15)
    elif by:
        ax.set_title(f'Boxplot by {by}',
                     fontsize=BoxConfig.DEFAULTS['title_fontsize'],
                     fontweight='bold', pad=15)
    if xlabel:
        ax.set_xlabel(xlabel, fontsize=BoxConfig.DEFAULTS['label_fontsize'])
    if ylabel:
        ax.set_ylabel(ylabel, fontsize=BoxConfig.DEFAULTS['label_fontsize'])

    plt.suptitle('')
    BoxConfig.clean_spines(ax)
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

    df = pd.DataFrame({
        'Sản phẩm': np.repeat(['A', 'B', 'C', 'D'], 50),
        'Doanh số': np.concatenate([
            np.random.normal(100, 15, 50),
            np.random.normal(120, 20, 50),
            np.random.normal(85, 10, 50),
            np.random.normal(110, 18, 50),
        ]),
        'Khu vực': np.tile(['Bắc', 'Nam'], 100),
    })

    group_a = np.random.normal(100, 15, 50)
    group_b = np.random.normal(120, 20, 50)
    group_c = np.random.normal(85, 10, 50)
    group_d = np.random.normal(110, 18, 50)

    print("=== Box Plot Examples ===\n")

    # 1. Basic box plot
    plot_box(
        data=[group_a, group_b, group_c, group_d],
        labels=['Nhóm A', 'Nhóm B', 'Nhóm C', 'Nhóm D'],
        title='Phân bố điểm theo nhóm',
        xlabel='Nhóm', ylabel='Điểm số',
        color='#3498db',
        showmeans=True, meanline=False,
        grid=True,
        show=False, save_path='charts/output/box_basic.png'
    )
    print("1. Basic box plot: charts/output/box_basic.png")

    # 2. Horizontal box
    plot_horizontal_box(
        data=[group_a, group_b, group_c, group_d],
        labels=['Nhóm A', 'Nhóm B', 'Nhóm C', 'Nhóm D'],
        title='Phân bố điểm theo nhóm (ngang)',
        xlabel='Điểm số', ylabel='Nhóm',
        color='#2ecc71',
        showmeans=True,
        grid=True,
        show=False, save_path='charts/output/box_horizontal.png'
    )
    print("2. Horizontal box: charts/output/box_horizontal.png")

    # 3. Grouped box from DataFrame
    plot_grouped_box(
        df=df, x_col='Sản phẩm', y_col='Doanh số',
        title='Doanh số theo sản phẩm',
        xlabel='Sản phẩm', ylabel='Doanh số (Triệu)',
        palette='Set2',
        showmeans=True,
        grid=True,
        show=False, save_path='charts/output/box_grouped.png'
    )
    print("3. Grouped box: charts/output/box_grouped.png")
