# PROMPT: Box Plot (Biểu đồ hộp)

## Mô tả
Biểu đồ hộp (Box Plot) dùng để thể hiện phân bố dữ liệu qua 5 giá trị: minimum, Q1, median, Q3, maximum. Ngoài ra còn thể hiện outliers. Phù hợp để so sánh phân bố giữa nhiều nhóm và phát hiện giá trị ngoại lai.

## Keywords đặc trưng
```
- kind='box'                # (pandas)
- plt.boxplot()             # (matplotlib)
- patch_artist              # tô màu box
- showmeans                 # hiển thị mean
- meanline                  # mean là đường thẳng
- showfliers                # hiển thị outliers
- vert                      # đứng/ngang
- flierprops                # style outliers
- medianprops               # style đường median
- boxprops                  # style box
- whiskerprops              # style whisker
- capprops                  # style cap
```

## Prompt Template

```
Tạo biểu đồ hộp (Box Plot) bằng [matplotlib/pandas].

Dữ liệu:
- File: [TÊN_FILE.csv/excel/JSON]
- Cột: [TÊN_CỘT / DANH_SÁCH_CỘT]
- Nhóm: [TÊN_CỘT_NHÓM] (tùy chọn - cho groupby)

Yêu cầu:
- Title: [TIÊU_ĐỀ_BIỂU_ĐỒ]
- X label: [NHÃN_TRỤC_X]
- Y label: [NHÃN_TRỌC_Y]
- Orientation: [vertical/horizontal]
- Tô màu box: [True/False]
- Màu sắc: [MÀU_ĐƠN / DANH_SÁCH_MÀU]
- Hiển thị mean: [True/False]
- Mean line style: [line/dot]
- Hiển thị outliers: [True/False]
- Outlier marker: [o/D/s/^]
- Outlier color: [MÀU]
- Outlier size: [GIÁ_TRỊ]
- Nhãn nhóm: [DANH_SÁCH_TÊN]
- Grid: [True/False], axis: [y/x]
- Legend: [True/False]
- Figure size: [WIDTH, HEIGHT]
- DPI: [GIÁ_TRỊ]
- Style: [TÊN_STYLE]
- Save as: [TÊN_FILE.png]
```

## Keywords Matrix

| Mục | Keywords | Giá trị mẫu |
|------|----------|-------------|
| Orientation | vert, orientation | True (đứng), False (ngang) |
| Tô màu box | patch_artist | True, False |
| Màu box | boxprops, facecolor | dict(color, facecolor) |
| Viền box | boxprops | linewidth, color |
| Median line | medianprops | color, linewidth |
| Mean | showmeans, meanline | True, True/False |
| Style mean | meanprops | marker, color, linewidth |
| Whisker | whiskerprops | color, linewidth, linestyle |
| Cap | capprops | color, linewidth |
| Outlier | showfliers, flierprops | True, dict(marker, color) |
| Labels | labels | ['A','B','C','D'] |
| Notch | notch | True, False |
| Nhãn trục | xlabel, ylabel | fontsize, labelpad |
| Tiêu đề | title | fontsize, fontweight |
| Grid | grid | True, axis |
| Width | widths | 0.5, 0.7 (single box) |
| Positions | positions | [1, 2, 3] (vị trí boxes) |
| Style | plt.style.use | 'ggplot', 'seaborn-v0_8-whitegrid' |

## Tương tác với các keywords khác

### Khi kết hợp với "patch_artist=True":
```
- Cần set facecolor cho mỗi box
- Dùng vòng lặp: for patch, color in zip(boxes, colors)
- Có thể set alpha cho màu
- Kết hợp edgecolor để tạo viền đẹp
```

### Khi kết hợp với "showmeans":
```
- meanline=True: hiển thị mean như đường kẻ ngang dashed
- meanline=False: hiển thị mean như dấu chấm/tam giác
- meanprops: cấu hình style cho mean marker
```

### Khi kết hợp với "notch":
```
- notch=True: vẽ khấc (indent) ở median
- Thể hiện confidence interval của median
- Cần dữ liệu đủ lớn để đẹp
```

## File code tương ứng
Xem: `charts/codes/05_box_chart.py`
