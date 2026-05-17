# PROMPT: Area Chart (Biểu đồ vùng)

## Mô tả
Biểu đồ vùng (Area Chart) là dạng mở rộng của line chart, với vùng bên dưới đường được tô màu. Phù hợp để thể hiện tích lũy theo thời gian, so sánh nhiều nhóm, và hiển thị xu hướng tổng thể. Có thể stacked (chồng) hoặc overlapping.

## Keywords đặc trưng
```
- kind='area'               # (pandas)
- plt.fill_between()       # (matplotlib)
- stacked                   # chồng vùng
- alpha                     # độ trong suốt
- baseline                  # đường baseline
- colormap                  # bảng màu
- legend                    # chú thích
```

## Prompt Template

```
Tạo biểu đồ vùng (Area Chart) bằng [matplotlib/pandas].

Dữ liệu:
- File: [TÊN_FILE.csv/excel/JSON]
- X axis: [TÊN_CỘT_X / index]
- Y axis: [TÊN_CỘT_Y / DANH_SÁCH_CỘT_Y]

Yêu cầu:
- Title: [TIÊU_ĐỀ_BIỂU_ĐỒ]
- X label: [NHÃN_TRỤC_X]
- Y label: [NHÃN_TRỤC_Y]
- Stacked: [True (chồng) / False (đè nhau)]
- Màu sắc: [DANH_SÁCH_MÀU / PALETTE / COLORMAP]
- Độ trong suốt: [alpha: 0.5-0.8]
- Baseline: [zero / symmedian / weighted / custom]
- Grid: [True/False]
- Legend: [True/False], vị trí: [NHÃN]
- Xoay nhãn X: [0/45/90]
- Xlim/Ylim: [GIỚI_HẠN]
- Figure size: [WIDTH, HEIGHT]
- DPI: [GIÁ_TRỊ]
- Style: [TÊN_STYLE]
- Save as: [TÊN_FILE.png]
```

## Keywords Matrix

| Mục | Keywords | Giá trị mẫu |
|------|----------|-------------|
| Loại | stacked | True, False |
| Màu sắc | colors, colormap | ['#3498db',...], 'tab10' |
| Độ trong suốt | alpha | 0.4, 0.5, 0.6, 0.7, 0.8 |
| Baseline | baseline, where | 'zero', 'sym', 'wiggle', array |
| Vùng | fill_between, fill | x, y1, y2 |
| Nhãn trục | xlabel, ylabel | fontsize, labelpad |
| Tiêu đề | title | fontsize, fontweight |
| Legend | legend | loc, fontsize, frameon |
| Grid | grid | True, linestyle, alpha |
| Rotation | rot, rotation | 0, 45, 90 |
| Giới hạn | xlim, ylim | (min, max) |
| Nhãn X | xticks, xticklabels | array |
| Line style | linestyle | '-', '--', '-' |
| Line width | linewidth | 0.5, 1, 1.5 |
| Style | plt.style.use | 'ggplot', 'seaborn-v0_8-whitegrid' |

## Tương tác với các keywords khác

### Khi kết hợp với "stacked=True":
```
- Các vùng chồng lên nhau
- Tổng chiều cao = tổng tất cả các giá trị
- Màu: dùng colormap sequential (ví dụ: Blues)
- Thường dùng để thể hiện cơ cấu thay đổi theo thời gian
```

### Khi kết hợp với "stacked=False":
```
- Các vùng đè lên nhau
- Cần alpha thấp (0.3-0.5) để nhìn thấy hết
- Dùng để so sánh trực tiếp các nhóm
- Màu khác nhau hoàn toàn
```

### Khi kết hợp với "fill_between có điều kiện":
```
- where: array boolean để chọn vùng tô
- Ví dụ: tô vùng > 0, tô vùng âm khác màu
- Kết hợp với axhline cho đường 0
```

## File code tương ứng
Xem: `charts/codes/08_area_chart.py`
