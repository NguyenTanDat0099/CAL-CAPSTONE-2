# PROMPT: Line Chart (Biểu đồ đường)

## Mô tả
Biểu đồ đường (Line Chart) dùng để hiển thị xu hướng dữ liệu theo thời gian hoặc theo thứ tự. Phù hợp khi muốn thể hiện sự thay đổi của một hoặc nhiều chuỗi dữ liệu qua các giai đoạn.

## Keywords đặc trưng
```
- kind='line'              # (pandas)
- plt.plot()               # (matplotlib)
- linestyle, linewidth     # kiểu và độ dày đường
- marker                   # điểm đánh dấu trên đường
- markersize               # kích thước marker
- fill_between             # tô vùng giữa 2 đường
- multiple lines           # nhiều đường trên 1 biểu đồ
- trend line               # đường xu hướng
```

## Prompt Template

```
Tạo biểu đồ đường (Line Chart) bằng [matplotlib/pandas].

Dữ liệu:
- File: [TÊN_FILE.csv/excel/JSON]
- X axis: [TÊN_CỘT_X / index]
- Y axis: [TÊN_CỘT_Y / DANH_SÁCH_CỘT_Y]

Yêu cầu:
- Title: [TIÊU_ĐỀ_BIỂU_ĐỒ]
- X label: [NHÃN_TRỤC_X]
- Y label: [NHÃN_TRỤC_Y]
- Line style: [solid/dashed/dotted/dash-dot]
- Line width: [1/1.5/2/2.5/3]
- Marker: [o/s/^/D/x/+/*]
- Marker size: [5/8/10/12]
- Màu đường: [TÊN_MÀU / MÃ_HEX]
- Hiển thị nhiều đường: [SỐ_LƯỢNG] đường
- Fill between: [CỘT_1, CỘT_2] để tô vùng giữa 2 đường
- Grid: [True/False], style: [solid/dashed/dotted]
- Legend: [HIỂN_THỊ/ẨN], vị trí: [upper right/lower left/best]
- Figure size: [WIDTH, HEIGHT]
- DPI: [GIÁ_TRỊ]
- Style: [ggplot/seaborn/fivethirtyeight/dark_background]
- Annotate điểm đặc biệt: [CÓ/KHÔNG]
- Horizontal line (ngưỡng): [GIÁ_TRỊ_Y, MÀU, STYLE]
- Save as: [TÊN_FILE.png/pdf/svg]
```

## Keywords Matrix

| Mục | Keywords | Giá trị mẫu |
|------|----------|-------------|
| Loại biểu đồ | kind, plot_type | line, multiple, dual_axis |
| Đường | linestyle | '-', '--', ':', '-.', (0, (5, 5)) |
| Độ dày | linewidth, lw | 0.5, 1, 1.5, 2, 2.5, 3 |
| Marker | marker, m | 'o', 's', '^', 'D', 'P', '*', 'X' |
| Kích thước marker | markersize, ms | 4, 6, 8, 10, 12, 15 |
| Tô vùng | fill_between, fill | alpha=0.2-0.5, color |
| Màu sắc | color, c, hex | '#3498db', 'coral', 'steelblue' |
| Grid | grid, gridlines | True, axis='x/y/both' |
| Trục đôi | twinx, twiny, secondary_y | True |
| Nhãn trục | xlabel, ylabel, set_xlabel | fontsize, labelpad |
| Tiêu đề | title, suptitle | fontsize, fontweight |
| Legend | legend, label | loc, fontsize, frameon |
| Ghi chú | annotate, text, arrowprops | xy, xytext, fontsize |
| Trục X | xticks, xlim, xscale | rotation, labelsize |
| Trục Y | yticks, ylim, yscale | rotation, labelsize |
| Lưu file | savefig | dpi, bbox_inches, format |
| Style | plt.style.use | 'ggplot', 'seaborn-v0_8-whitegrid' |

## Tương tác với các keywords khác

### Khi kết hợp với "multiple lines":
```
- Mỗi đường cần: label, color, linestyle, marker riêng
- Legend: hiển thị tất cả các label
- Màu sắc: dùng color palette để phân biệt
- Có thể dùng: secondary_y cho đường có scale khác
```

### Khi kết hợp với "fill_between":
```
- Tô vùng giữa 2 đường: plt.fill_between(x, y1, y2)
- Tham số: alpha (độ trong suốt), where (điều kiện)
- Dùng cho: vùng chênh lệch, vùng lợi nhuận, confidence interval
```

### Khi kết hợp với "annotate":
```
- Đánh dấu điểm: đỉnh, đáy, giao điểm, giá trị đặc biệt
- arrowprops: kiểu mũi tên
- bbox: khung chữ nhật quanh text
```

## Ví dụ Prompt cụ thể

**Đơn giản:**
```
Tạo line chart từ file sales.csv, cột Tháng (X) và Doanh thu (Y),
màu xanh dương, có marker tròn, title "Doanh thu theo tháng".
```

**Nâng cao:**
```
Tạo line chart 2 đường từ df có cột Tháng, Doanh_thu, Chi_Phi.
- Đường 1: Doanh thu, màu xanh dương, line solid, marker o
- Đường 2: Chi phí, màu đỏ, line dashed, marker s
- Tô vùng giữa 2 đường bằng màu tím alpha=0.2
- Thêm đường ngang ngưỡng lợi nhuận 50M (màu vàng, dashed)
- Annotate điểm đỉnh doanh thu
- Grid dashed, legend upper left, style ggplot
- Figure 14x7, DPI 150, lưu file revenue_chart.png
```

## File code tương ứng
Xem: `charts/codes/01_line_chart.py`
