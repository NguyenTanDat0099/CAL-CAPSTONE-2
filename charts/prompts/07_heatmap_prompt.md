# PROMPT: Heatmap (Bản đồ nhiệt)

## Mô tả
Heatmap (Bản đồ nhiệt) dùng để thể hiện dữ liệu ma trận 2 chiều bằng màu sắc. Mỗi ô có màu tương ứng với giá trị. Phù hợp để hiển thị ma trận tương quan, dữ liệu thời gian-giá trị, và so sánh nhiều biến cùng lúc.

## Keywords đặc trưng
```
- plt.imshow()              # (matplotlib)
- plt.pcolormesh()          # (matplotlib)
- sns.heatmap()             # (seaborn)
- cmap                      # bảng màu
- annot                     # hiển thị số trên ô
- fmt                       # format số
- cbar                      # colorbar
- xticklabels, yticklabels   # nhãn trục
- linewidths                # độ dày đường kẻ
- square                    # ô vuông
- vmin, vmax                # giới hạn màu
- mask                      # ẩn ô theo điều kiện
```

## Prompt Template

```
Tạo bản đồ nhiệt (Heatmap) bằng [matplotlib/seaborn].

Dữ liệu:
- File: [TÊN_FILE.csv/excel/JSON]
- Ma trận: [TÊN_CỘT_MA_TRẬN / DataFrame 2D]
- Hàng: [TÊN_CỘT_HÀNG]
- Cột: [TÊN_CỘT_CỘT]

Yêu cầu:
- Title: [TIÊU_ĐỀ_BIỂU_ĐỒ]
- X label: [NHÃN_TRỤC_X]
- Y label: [NHÃN_TRỤC_Y]
- Colormap: [viridis/plasma/coolwarm/RdYlGn/YlOrRd/Blues]
- Giới hạn màu: [vmin: MIN, vmax: MAX]
- Annotate: [True/False]
- Format số: [.0f / .1f / .2f]
- Font annotate: [fontsize]
- Màu chữ annotate: [tự động theo nền / trắng / đen]
- Colorbar: [True/False]
- Cbar label: [NHÃN_COLORBAR]
- Nhãn trục X: [DANH_SÁCH / auto], rotation: [0/45/90]
- Nhãn trục Y: [DANH_SÁCH / auto], rotation: [0/45/90]
- Grid lines: [True/False], linewidth: [GIÁ_TRỊ]
- Ô vuông: [True/False]
- Mask (ẩn ô): [ĐIỀU_KIỆN]
- Center: [GIÁ_TRỊ] (cho diverging colormap)
- Figure size: [WIDTH, HEIGHT]
- DPI: [GIÁ_TRỊ]
- Save as: [TÊN_FILE.png]
```

## Keywords Matrix

| Mục | Keywords | Giá trị mẫu |
|------|----------|-------------|
| Dữ liệu | data, X | 2D array, DataFrame |
| Colormap | cmap | 'viridis', 'coolwarm', 'RdYlGn', 'Blues' |
| Giới hạn | vmin, vmax | giá trị min/max |
| Annotate | annot | True, False |
| Format | fmt | '.0f', '.1f', '.2f', 'd' (integer) |
| Font annotate | annot_kws | dict(fontsize, fontweight) |
| Colorbar | cbar | True, False |
| Cbar label | cbar_kws | dict(label) |
| Nhãn X | xticklabels | True, False, ['A','B','C'] |
| Rotation X | rot_x | 0, 45, 90 |
| Nhãn Y | yticklabels | True, False, ['A','B','C'] |
| Rotation Y | rot_y | 0, 45, 90 |
| Grid | linewidths | 0.5, 1, 2 |
| Màu grid | linecolor | 'white', 'gray' |
| Vuông | square | True, False |
| Mask | mask | 2D boolean array |
| Center | center | giá trị trung tâm (cho diverging) |
| Aspect | aspect | 'auto', 1.5, 2 |
| Interpolation | interpolation | 'nearest', 'bilinear', 'bicubic' |
| Tiêu đề | title | fontsize, fontweight |
| Labels | xlabel, ylabel | fontsize, labelpad |
| Style | plt.style.use | 'ggplot', 'seaborn-v0_8-whitegrid' |

## Tương tác với các keywords khác

### Khi kết hợp với "diverging colormap":
```
- Dùng khi có giá trị trung tâm có ý nghĩa
- Colormap: 'coolwarm', 'RdYlGn', 'seismic'
- Center: đặt giá trị trung tâm (ví dụ: 0 cho tương quan)
- vmin/vmax đối xứng quanh center
```

### Khi kết hợp với "annotate":
```
- Duyệt từng ô: for i in range(n), for j in range(m)
- Tính màu chữ tự động: nếu giá trị > mid → trắng, ngược lại → đen
- Format: .0f (int), .1f (1 decimal), .2f (2 decimals)
- annot_kws: fontsize, fontweight, color
```

### Khi kết hợp với "mask":
```
- Tạo mask: mask = df < threshold
- Áp dụng: sns.heatmap(df, mask=mask)
- Phần bị mask sẽ trắng/không hiển thị
- Thường dùng cho ma trận tương quan (ẩn nửa trên)
```

## File code tương ứng
Xem: `charts/codes/07_heatmap.py`
