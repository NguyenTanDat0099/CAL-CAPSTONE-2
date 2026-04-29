# PROMPT: Bar Chart (Biểu đồ cột)

## Mô tả
Biểu đồ cột (Bar Chart) dùng để so sánh giá trị giữa các nhóm/categories khác nhau. Phù hợp khi dữ liệu mang tính phân loại (category) và cần so sánh trực quan giá trị giữa các nhóm.

## Keywords đặc trưng
```
- kind='bar'               # (pandas)
- plt.bar() / plt.barh()   # (matplotlib)
- width, height             # độ rộng cột
- stacked                   # cột chồng
- grouped                   # cột nhóm
- horizontal bar            # cột ngang
- edgecolor, linewidth      # viền cột
- rot, rotation             # góc xoay nhãn
```

## Prompt Template

```
Tạo biểu đồ cột (Bar Chart) bằng [matplotlib/pandas].

Dữ liệu:
- File: [TÊN_FILE.csv/excel/JSON]
- X axis: [TÊN_CỘT_X / categories]
- Y axis: [TÊN_CỘT_Y / giá trị]
- Các cột: [DANH_SÁCH_CỘT] (cho grouped/stacked)

Yêu cầu:
- Title: [TIÊU_ĐỀ_BIỂU_ĐỒ]
- X label: [NHÃN_TRỤC_X]
- Y label: [NHÃN_TRỤC_Y]
- Loại: [single/grouped/stacked/horizontal]
- Độ rộng cột: [0.5/0.7/0.8/1.0]
- Màu sắc: [MÀU_ĐƠN / DANH_SÁCH_MÀU / PALETTE]
- Viền: [edgecolor, linewidth]
- Xoay nhãn trục X: [0/30/45/90]
- Grid: [True/False], axis: [x/y/both]
- Legend: [HIỂN_THỊ/ẨN], vị trí
- Figure size: [WIDTH, HEIGHT]
- DPI: [GIÁ_TRỊ]
- Style: [TÊN_STYLE]
- Annotate giá trị: [CÓ/KHÔNG], vị trí: [top/center/bottom]
- Save as: [TÊN_FILE.png/pdf/svg]
```

## Keywords Matrix

| Mục | Keywords | Giá trị mẫu |
|------|----------|-------------|
| Loại | kind, orientation | bar (vertical), barh (horizontal) |
| Độ rộng | width, height | 0.5, 0.7, 0.8, 1.0 |
| Chiều cao | height (barh) | tương tự width |
| Màu sắc | color, colors, facecolor | '#3498db', ['#3498db','#e74c3c'] |
| Viền | edgecolor, linewidth | 'white', 0.8, 1.2 |
| Độ trong suốt | alpha | 0.6, 0.75, 0.85, 0.9 |
| Xoay | rot, rotation | 0, 30, 45, 90 |
| Chồng | stacked | True, False |
| Nhóm | grouped, side_by_side | True, False |
| Vị trí nhãn | label_type | 'center', 'edge', 'inside' |
| Nhãn trục | xlabel, ylabel | fontsize, labelpad |
| Tiêu đề | title | fontsize, fontweight |
| Legend | legend | loc, fontsize |
| Grid | grid | True/False, axis |
| Annotate | annotate | xy, text, fontsize |
| Style | plt.style.use | 'ggplot', 'seaborn-v0_8-whitegrid' |

## Tương tác với các keywords khác

### Khi kết hợp với "stacked":
```
- stacked=True: các cột chồng lên nhau
- Cần: nhiều cột dữ liệu
- Màu: mỗi phần 1 màu, dùng palette
- Legend: hiển thị tên các phần
```

### Khi kết hợp với "grouped":
```
- Nhiều cột cạnh nhau cho mỗi nhóm
- Tính offset: x_pos + (i - n/2 + 0.5) * width
- Cần gán nhãn nhóm chính xác
```

### Khi kết hợp với "horizontal (barh)":
```
- plt.barh(): cột nằm ngang
- Tiêu đề trục X/Y đổi chỗ
- Thuận lợi cho nhãn dài
- rotation cho nhãn trục Y
```

## File code tương ứng
Xem: `charts/codes/02_bar_chart.py`
