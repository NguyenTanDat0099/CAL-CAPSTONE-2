# PROMPT: Histogram (Biểu đồ tần suất)

## Mô tả
Biểu đồ tần suất (Histogram) dùng để thể hiện phân bố của một biến liên tục. Các giá trị được chia thành các bins (khoảng) và đếm số lượng quan sát trong mỗi bin. Phù hợp để xem hình dạng phân bố (chuẩn, lệch, hai đỉnh...).

## Keywords đặc trưng
```
- kind='hist'               # (pandas)
- plt.hist()                # (matplotlib)
- bins                       # số khoảng chia
- range                      # giới hạn giá trị
- density                    # tỷ lệ (thay vì count)
- histtype                   # kiểu: bar, step, stepfilled
- edgecolor, linewidth       # viền bins
- alpha                      # độ trong suốt
- kde                        # đường mật độ kernel
```

## Prompt Template

```
Tạo biểu đồ tần suất (Histogram) bằng [matplotlib/pandas].

Dữ liệu:
- File: [TÊN_FILE.csv/excel/JSON]
- Cột: [TÊN_CỘT_DỮ_LIỆU]
- Range: [MIN, MAX] (tùy chọn)

Yêu cầu:
- Title: [TIÊU_ĐỀ_BIỂU_ĐỒ]
- X label: [NHÃN_TRỤC_X] (tên biến)
- Y label: [Tần suất / Số lượng / Tỷ lệ]
- Số bins: [10/20/30/50/100]
- Range: [GIÁ_TRỊ_MIN, GIÁ_TRỊ_MAX]
- Kiểu hist: [bar/step/stepfilled]
- Màu sắc: [MÀU]
- Viền: [edgecolor, linewidth]
- Độ trong suốt: [alpha: 0.6-0.8]
- Normalized (tỷ lệ): [True/False]
- KDE line: [CÓ/KHÔNG]
- Grid: [True/False], axis: [y/x/both]
- Mean/Median line: [CÓ/KHÔNG], giá trị
- Figure size: [WIDTH, HEIGHT]
- DPI: [GIÁ_TRỊ]
- Style: [TÊN_STYLE]
- Save as: [TÊN_FILE.png]
```

## Keywords Matrix

| Mục | Keywords | Giá trị mẫu |
|------|----------|-------------|
| Số bins | bins | 10, 15, 20, 30, 50, 100 |
| Giới hạn | range, xlim | (min, max), (0, 100) |
| Kiểu | histtype | 'bar', 'step', 'stepfilled' |
| Tỷ lệ | density, normed | True (= PDF), False (= count) |
| Tần suất | weights | array cùng shape |
| Màu sắc | color, facecolor | '#3498db', 'steelblue' |
| Viền | edgecolor, linewidth | 'white', 0.8, 1.2 |
| Độ trong suốt | alpha | 0.5, 0.65, 0.75 |
| Nhãn trục | xlabel, ylabel | fontsize, labelpad |
| Tiêu đề | title | fontsize, fontweight |
| Grid | grid | True, linestyle, axis |
| KDE | kde, kdeplot | True, requires scipy |
| Mean line | axvline, mean | muốn thêm mean line |
| Median line | axvline, median | muốn thêm median line |
| Multiple | multiple | 'stack', 'dodge', 'layer', 'step' |

## Tương tác với các keywords khác

### Khi kết hợp với "KDE":
```
- Dùng scipy.stats.gaussian_kde
- Scale KDE theo histogram (nhân với count max)
- Vẽ đường KDE với linewidth cao hơn
- Màu khác biệt: đỏ hoặc cam
```

### Khi kết hợp với "multiple (nhiều histogram)":
```
- multiple='stack': chồng lên nhau
- multiple='dodge': cạnh nhau trong mỗi bin
- multiple='layer': đè lên nhau (cần alpha thấp)
- multiple='step': dạng đường, không tô
```

### Khi kết hợp với "mean/median line":
```
- Tính mean: np.mean(data) hoặc df['col'].mean()
- Tính median: np.median(data) hoặc df['col'].median()
- Vẽ: ax.axvline(mean, color='red', linestyle='--')
- Annotate giá trị lên line
```

## File code tương ứng
Xem: `charts/codes/04_histogram.py`
