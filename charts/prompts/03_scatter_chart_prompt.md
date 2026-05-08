# PROMPT: Scatter Plot (Biểu đồ phân tán)

## Mô tả
Biểu đồ phân tán (Scatter Plot) dùng để thể hiện mối quan hệ giữa 2 hoặc nhiều biến. Mỗi điểm trên biểu đồ đại diện cho một quan sát. Phù hợp để tìm xu hướng, tương quan, và phân cụm trong dữ liệu.

## Keywords đặc trưng
```
- kind='scatter'            # (pandas)
- plt.scatter()             # (matplotlib)
- c (color)                 # màu theo giá trị
- s (size)                  # kích thước điểm
- cmap (colormap)           # bảng màu
- marker                    # hình dạng điểm
- edgecolor, linewidths      # viền điểm
- alpha                     # độ trong suốt
- vmin, vmax                # giới hạn màu
```

## Prompt Template

```
Tạo biểu đồ phân tán (Scatter Plot) bằng [matplotlib/pandas].

Dữ liệu:
- File: [TÊN_FILE.csv/excel/JSON]
- X axis: [TÊN_CỘT_X]
- Y axis: [TÊN_CỘT_Y]
- Màu theo: [TÊN_CỘT_Z] (tùy chọn - biến thứ 3)
- Kích thước theo: [TÊN_CỘT_SIZE] (tùy chọn)

Yêu cầu:
- Title: [TIÊU_ĐỀ_BIỂU_ĐỒ]
- X label: [NHÃN_TRỤC_X]
- Y label: [NHÃN_TRỤC_Y]
- Marker: [o/s/D/^/+/*]
- Kích thước điểm (s): [GIÁ_TRỊ / TÊN_CỘT]
- Màu (c): [MÀU_ĐƠN / TÊN_CỘT]
- Colormap: [viridis/plasma/coolwarm/RdYlGn/Blues]
- Colorbar: [True/False], nhãn: [TÊN]
- Viền: [edgecolor, linewidths]
- Độ trong suốt: [alpha: 0.5-0.9]
- Grid: [True/False]
- Legend: [HIỂN_THỊ/ẨN]
- Regression line: [CÓ/KHÔNG]
- Figure size: [WIDTH, HEIGHT]
- DPI: [GIÁ_TRỊ]
- Save as: [TÊN_FILE.png]
```

## Keywords Matrix

| Mục | Keywords | Giá trị mẫu |
|------|----------|-------------|
| Tọa độ | x, y | cột dữ liệu |
| Kích thước | s, size | 50, 100, scalar, array |
| Màu sắc | c, color, facecolor | 'red', '#3498db', array |
| Marker | marker | 'o', 's', 'D', '^', 'P', '*' |
| Viền | edgecolor, linewidths | 'black', 0.5, 1, 1.5 |
| Colormap | cmap | 'viridis', 'plasma', 'coolwarm', 'RdYlGn' |
| Giới hạn màu | vmin, vmax | giá trị min/max |
| Độ trong suốt | alpha | 0.4, 0.6, 0.7, 0.8 |
| Colorbar | colorbar, cbar | True/False |
| Cbar label | cbar_label | 'Giá trị' |
| Nhãn trục | xlabel, ylabel | fontsize, labelpad |
| Tiêu đề | title | fontsize, fontweight |
| Legend | legend, label | loc, fontsize |
| Grid | grid | True, linestyle |
| Regression | regression, trendline | True, order, degree |
| Xlim/Ylim | xlim, ylim | (min, max) |

## Tương tác với các keywords khác

### Khi kết hợp với "c (màu theo giá trị)":
```
- c là array cùng shape với x, y
- Dùng cmap để map giá trị -> màu
- Kết hợp với colorbar để hiển thị thang màu
- vmin/vmax để kiểm soát phạm vi màu
```

### Khi kết hợp với "s (kích thước theo giá trị)":
```
- s là array để mỗi điểm có kích thước khác nhau
- Thường scale s để nhìn đẹp: s * factor
- Kết hợp với c để thể hiện 3-4 biến
```

### Khi kết hợp với "regression/trendline":
```
- Dùng numpy.polyfit để fit đường
- plt.plot(x, y_pred, color='red', linewidth=2)
- Có thể thêm confidence interval
```

## File code tương ứng
Xem: `charts/codes/03_scatter_chart.py`
