"""
Line Chart - Biểu đồ đường
Prompts: charts/prompts/01_line_chart_prompt.md
"""
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np
from typing import Optional, List, Tuple, Union


# ============================================================
# CONFIGURATION
# ============================================================

class LineChartConfig:
    """Cấu hình mặc định cho Line Chart."""

    DEFAULTS = {
        'figsize': (12, 7),
        'dpi': 150,
        'style': 'seaborn-v0_8-whitegrid',
        'colors': ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'],
        'linestyles': ['-', '--', ':', '-.'],
        'markers': ['o', 's', '^', 'D', 'P', '*', 'X', 'd'],
        'linewidth': 2.5,
        'markersize': 8,
        'alpha': 0.9,
        'title_fontsize': 18,
        'label_fontsize': 13,
        'tick_fontsize': 11,
        'legend_fontsize': 12,
    }

    @staticmethod
    def apply_style(style: Optional[str] = None):
        try:
            plt.style.use(style or LineChartConfig.DEFAULTS['style'])
        except Exception:
            pass

    @staticmethod
    def clean_spines(ax):
        for spine in ['top', 'right']:
            ax.spines[spine].set_visible(False)


# ============================================================
# SINGLE LINE CHART
# ============================================================

def plot_single_line(
    x: Union[pd.Series, np.ndarray, List],
    y: Union[pd.Series, np.ndarray, List],
    title: str = '',
    xlabel: str = '',
    ylabel: str = '',
    color: str = '#3498db',
    linestyle: str = '-',
    linewidth: float = 2.5,
    marker: str = 'o',
    markersize: float = 8,
    alpha: float = 0.9,
    label: Optional[str] = None,
    figsize: Tuple[int, int] = (12, 7),
    dpi: int = 150,
    style: Optional[str] = None,
    grid: bool = True,
    grid_linestyle: str = '--',
    grid_alpha: float = 0.5,
    xtick_rotation: int = 0,
    ytick_rotation: int = 0,
    xlim: Optional[Tuple[float, float]] = None,
    ylim: Optional[Tuple[float, float]] = None,
    hline: Optional[Tuple[float, str, str]] = None,
    vline: Optional[Tuple[float, str, str]] = None,
    fill_between: Optional[Tuple[Union[pd.Series, np.ndarray, List],
                                  float]] = None,
    fill_alpha: float = 0.2,
    fill_color: Optional[str] = None,
    annotate: Optional[Tuple[float, float, str]] = None,
    annotate_xytext: Optional[Tuple[float, float]] = None,
    annotate_arrow: bool = True,
    save_path: Optional[str] = None,
    show: bool = True
) -> plt.Figure:
    """
    Vẽ biểu đồ đường đơn (một đường).

    Args:
        x, y: dữ liệu trục X và Y
        color: màu đường (hex hoặc tên màu)
        linestyle: kiểu đường ('-', '--', ':', '-.')
        linewidth: độ dày đường
        marker: kiểu marker ('o', 's', '^', 'D', ...)
        markersize: kích thước marker
        alpha: độ trong suốt
        label: nhãn cho legend
        hline: tuple (value, color, linestyle) cho đường ngang
        vline: tuple (value, color, linestyle) cho đường đứng
        fill_between: tuple (y_value, alpha) để tô vùng dưới đường
        annotate: tuple (x, y, text) để ghi chú điểm
        annotate_xytext: tuple (x, y) cho vị trí text ghi chú
        save_path: đường dẫn lưu file
        show: hiển thị biểu đồ
    """
    LineChartConfig.apply_style(style)
    fig, ax = plt.subplots(figsize=figsize, dpi=dpi)

    ax.plot(x, y, linestyle=linestyle, linewidth=linewidth,
            marker=marker, markersize=markersize, color=color,
            alpha=alpha, label=label)

    if grid:
        ax.grid(True, linestyle=grid_linestyle, alpha=grid_alpha)

    if hline:
        val, hcolor, hstyle = hline
        ax.axhline(y=val, color=hcolor, linestyle=hstyle, linewidth=1.5)

    if vline:
        val, vcolor, vstyle = vline
        ax.axvline(x=val, color=vcolor, linestyle=vstyle, linewidth=1.5)

    if fill_between:
        y_val, f_alpha = fill_between
        fc = fill_color or color
        ax.fill_between(x, y, y_val, alpha=f_alpha, color=fc)

    if annotate:
        ax_x, ax_y, ann_text = annotate
        xytext = annotate_xytext or (ax_x + 0.5, ax_y + 5)
        arrowprops = dict(arrowstyle='->', color='red') if annotate_arrow else None
        ax.annotate(ann_text, xy=(ax_x, ax_y), xytext=xytext,
                    arrowprops=arrowprops, fontsize=10, color='red',
                    fontweight='bold')

    if title:
        ax.set_title(title, fontsize=LineChartConfig.DEFAULTS['title_fontsize'],
                     fontweight='bold', pad=15)
    if xlabel:
        ax.set_xlabel(xlabel, fontsize=LineChartConfig.DEFAULTS['label_fontsize'], labelpad=10)
    if ylabel:
        ax.set_ylabel(ylabel, fontsize=LineChartConfig.DEFAULTS['label_fontsize'], labelpad=10)

    ax.tick_params(axis='x', rotation=xtick_rotation,
                   labelsize=LineChartConfig.DEFAULTS['tick_fontsize'])
    ax.tick_params(axis='y', rotation=ytick_rotation,
                   labelsize=LineChartConfig.DEFAULTS['tick_fontsize'])

    if xlim:
        ax.set_xlim(xlim)
    if ylim:
        ax.set_ylim(ylim)

    if label:
        ax.legend(fontsize=LineChartConfig.DEFAULTS['legend_fontsize'],
                  frameon=True, edgecolor='gray')

    LineChartConfig.clean_spines(ax)
    plt.tight_layout()

    if save_path:
        fig.savefig(save_path, dpi=300, bbox_inches='tight', facecolor='white')

    if show:
        plt.show()

    return fig


# ============================================================
# MULTIPLE LINES CHART
# ============================================================

def plot_multiple_lines(
    df: pd.DataFrame,
    x: str,
    columns: List[str],
    title: str = '',
    xlabel: str = '',
    ylabel: str = '',
    colors: Optional[List[str]] = None,
    linestyles: Optional[List[str]] = None,
    markers: Optional[List[str]] = None,
    linewidth: float = 2.5,
    markersize: float = 8,
    alpha: float = 0.9,
    figsize: Tuple[int, int] = (14, 7),
    dpi: int = 150,
    style: Optional[str] = None,
    grid: bool = True,
    grid_linestyle: str = '--',
    grid_alpha: float = 0.5,
    legend_loc: str = 'best',
    legend_fontsize: int = 12,
    xtick_rotation: int = 0,
    ytick_rotation: int = 0,
    xlim: Optional[Tuple[float, float]] = None,
    ylim: Optional[Tuple[float, float]] = None,
    secondary_y: Optional[List[str]] = None,
    hline: Optional[List[Tuple[float, str, str]]] = None,
    fill_between_cols: Optional[Tuple[str, str]] = None,
    fill_alpha: float = 0.15,
    fill_color: Optional[str] = None,
    annotate_points: Optional[List[dict]] = None,
    save_path: Optional[str] = None,
    show: bool = True
) -> plt.Figure:
    """
    Vẽ biểu đồ nhiều đường.

    Args:
        df: DataFrame chứa dữ liệu
        x: tên cột trục X
        columns: danh sách cột Y cần vẽ
        colors: danh sách màu cho mỗi đường
        linestyles: danh sách kiểu đường
        markers: danh sách kiểu marker
        linewidth, markersize, alpha: style cho tất cả đường
        secondary_y: list cột vẽ trên trục Y phụ
        hline: list tuple (value, color, linestyle) cho đường ngang
        fill_between_cols: tuple (col1, col2) tô vùng giữa 2 cột
        annotate_points: list dicts với keys: x_val, y_col, text
        save_path: đường dẫn lưu file
        show: hiển thị biểu đồ
    """
    LineChartConfig.apply_style(style)

    if secondary_y:
        fig, ax1 = plt.subplots(figsize=figsize, dpi=dpi)
        ax2 = ax1.twinx()
        axes = {'primary': ax1, 'secondary': ax2}
    else:
        fig, ax = plt.subplots(figsize=figsize, dpi=dpi)
        axes = {'primary': ax}

    cfg = LineChartConfig.DEFAULTS
    color_list = colors or cfg['colors']
    ls_list = linestyles or cfg['linestyles']
    mk_list = markers or cfg['markers']

    for i, col in enumerate(columns):
        is_secondary = secondary_y and col in secondary_y
        ax = axes['secondary'] if is_secondary else axes['primary']

        color = color_list[i % len(color_list)]
        linestyle = ls_list[i % len(ls_list)]
        marker = mk_list[i % len(mk_list)]

        ax.plot(df[x], df[col], linestyle=linestyle, linewidth=linewidth,
                marker=marker, markersize=markersize, color=color,
                alpha=alpha, label=col)

    if grid:
        if secondary_y:
            axes['primary'].grid(True, linestyle=grid_linestyle,
                                alpha=grid_alpha, axis='y')
        else:
            axes['primary'].grid(True, linestyle=grid_linestyle,
                                alpha=grid_alpha)

    if hline:
        for val, hcolor, hstyle in hline:
            axes['primary'].axhline(y=val, color=hcolor, linestyle=hstyle,
                                    linewidth=1.5)

    if fill_between_cols:
        col1, col2 = fill_between_cols
        fc = fill_color or color_list[-1]
        axes['primary'].fill_between(df[x], df[col1], df[col2],
                                     alpha=fill_alpha, color=fc)

    if annotate_points:
        for ann in annotate_points:
            x_val = ann.get('x_val')
            y_col = ann.get('y_col')
            text = ann.get('text', '')
            xytext = ann.get('xytext')
            ax = axes['primary']
            ax_y = df.loc[df[x] == x_val, y_col].values[0]
            xytext = xytext or (x_val + 0.5, ax_y + 5)
            ax.annotate(text, xy=(x_val, ax_y), xytext=xytext,
                        arrowprops=dict(arrowstyle='->', color='#2c3e50'),
                        fontsize=10, color='#2c3e50', fontweight='bold')

    if title:
        axes['primary'].set_title(title,
                                  fontsize=cfg['title_fontsize'],
                                  fontweight='bold', pad=15)
    if xlabel:
        axes['primary'].set_xlabel(xlabel, fontsize=cfg['label_fontsize'], labelpad=10)
    if ylabel:
        axes['primary'].set_ylabel(ylabel, fontsize=cfg['label_fontsize'], labelpad=10)

    if secondary_y:
        axes['secondary'].set_ylabel(ylabel + ' (phụ)',
                                     fontsize=cfg['label_fontsize'], labelpad=10,
                                     color=color_list[len(axes['primary'].lines) - 1]
                                     if axes['primary'].lines else '#e74c3c')

    axes['primary'].tick_params(axis='x', rotation=xtick_rotation,
                                labelsize=cfg['tick_fontsize'])
    axes['primary'].tick_params(axis='y', rotation=ytick_rotation,
                                labelsize=cfg['tick_fontsize'])

    if xlim:
        axes['primary'].set_xlim(xlim)
    if ylim:
        axes['primary'].set_ylim(ylim)

    lines = axes['primary'].lines + (axes['secondary'].lines if secondary_y else [])
    labels = [col for col in columns]
    axes['primary'].legend(lines, labels, loc=legend_loc,
                           fontsize=legend_fontsize,
                           frameon=True, edgecolor='gray')

    LineChartConfig.clean_spines(axes['primary'])
    if secondary_y:
        axes['secondary'].spines['top'].set_visible(False)
        axes['secondary'].spines['right'].set_visible(False)

    plt.tight_layout()

    if save_path:
        fig.savefig(save_path, dpi=300, bbox_inches='tight', facecolor='white')

    if show:
        plt.show()

    return fig


# ============================================================
# PANDAS WRAPPER
# ============================================================

def pandas_line_chart(
    df: pd.DataFrame,
    x: Optional[str] = None,
    y: Optional[Union[str, List[str]]] = None,
    title: str = '',
    figsize: Tuple[int, int] = (12, 7),
    dpi: int = 150,
    style: Optional[str] = None,
    color: Optional[Union[str, List[str]]] = None,
    colormap: Optional[str] = None,
    linewidth: float = 2.5,
    marker: str = 'o',
    markersize: float = 8,
    alpha: float = 0.9,
    grid: bool = True,
    rot: int = 0,
    legend: Union[bool, str] = True,
    legend_loc: str = 'best',
    xlabel: Optional[str] = None,
    ylabel: Optional[str] = None,
    secondary_y: bool = False,
    save_path: Optional[str] = None,
    show: bool = True
) -> plt.Figure:
    """
    Vẽ line chart sử dụng pandas DataFrame.plot().

    Args:
        x: tên cột trục X (None = dùng index)
        y: tên cột Y (str hoặc list)
        color: màu đơn hoặc danh sách
        colormap: tên colormap
        legend: True/False hoặc 'reverse'
        secondary_y: vẽ trên trục Y phụ
        save_path: đường dẫn lưu file
        show: hiển thị biểu đồ
    """
    LineChartConfig.apply_style(style)

    ax = df.plot(kind='line', figsize=figsize, dpi=dpi,
                 x=x, y=y, color=color, colormap=colormap,
                 linewidth=linewidth, marker=marker, markersize=markersize,
                 alpha=alpha, grid=grid, rot=rot, legend=legend,
                 secondary_y=secondary_y)

    if title:
        ax.set_title(title, fontsize=LineChartConfig.DEFAULTS['title_fontsize'],
                     fontweight='bold', pad=15)
    if xlabel:
        ax.set_xlabel(xlabel, fontsize=LineChartConfig.DEFAULTS['label_fontsize'])
    if ylabel:
        ax.set_ylabel(ylabel, fontsize=LineChartConfig.DEFAULTS['label_fontsize'])

    if isinstance(legend, str) and legend == 'reverse':
        handles, labels = ax.get_legend_handles_labels()
        ax.legend(handles[::-1], labels[::-1], loc=legend_loc,
                  fontsize=LineChartConfig.DEFAULTS['legend_fontsize'])
    elif legend:
        ax.legend(loc=legend_loc, fontsize=LineChartConfig.DEFAULTS['legend_fontsize'])

    LineChartConfig.clean_spines(ax)
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
    # Sample data
    months = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12']
    df = pd.DataFrame({
        'Tháng': months,
        'Doanh thu': [120, 135, 110, 160, 175, 190, 185, 200, 210, 195, 220, 250],
        'Chi phí':   [80,  85,  90,  95, 100, 105, 110, 115, 120, 125, 130, 140],
        'Lợi nhuận': [40,  50,  20,  65,  75,  85,  75,  85,  90,  70,  90, 110],
        'Khách hàng': [50, 60, 55, 70, 75, 80, 78, 85, 90, 82, 95, 105]
    })

    print("=== Line Chart Examples ===\n")

    # 1. Single line
    plot_single_line(
        x=months, y=df['Doanh thu'],
        title='Doanh thu theo tháng',
        xlabel='Tháng', ylabel='Doanh thu (Triệu VNĐ)',
        color='#3498db', marker='o', markersize=8,
        hline=(150, '#e74c3c', '--'),
        fill_between=(0, 0.1),
        show=False, save_path='charts/output/line_single.png'
    )
    print("1. Single line chart: charts/output/line_single.png")

    # 2. Multiple lines
    plot_multiple_lines(
        df=df, x='Tháng',
        columns=['Doanh thu', 'Chi phí', 'Lợi nhuận'],
        title='Doanh thu, Chi phí và Lợi nhuận 12 tháng',
        xlabel='Tháng', ylabel='Giá trị (Triệu VNĐ)',
        markers=['o', 's', '^'],
        hline=[(150, '#e74c3c', '--'), (100, '#f39c12', ':')],
        fill_between_cols=('Doanh thu', 'Chi phí'),
        annotate_points=[
            {'x_val': 'T12', 'y_col': 'Doanh thu', 'text': 'Đỉnh: 250M', 'xytext': ('T11', 235)}
        ],
        show=False, save_path='charts/output/line_multiple.png'
    )
    print("2. Multiple lines: charts/output/line_multiple.png")

    # 3. Pandas wrapper
    pandas_line_chart(
        df=df.set_index('Tháng')[['Doanh thu', 'Chi phí']],
        title='Doanh thu & Chi phí (Pandas)',
        xlabel='Tháng', ylabel='Triệu VNĐ',
        color=['#3498db', '#e74c3c'],
        grid=True, marker='o',
        show=False, save_path='charts/output/line_pandas.png'
    )
    print("3. Pandas wrapper: charts/output/line_pandas.png")
