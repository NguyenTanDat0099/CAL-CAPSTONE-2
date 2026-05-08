# PROMPT: Pie Chart (Biểu đồ tròn)

## Mô tả
Biểu đồ tròn (Pie Chart) dùng để thể hiện tỷ lệ phần trăm của các thành phần trong một tổng thể. Mỗi phần (slice) đại diện cho một nhóm và diện tích tương ứng với tỷ lệ. Phù hợp khi có dưới 7 categories và muốn thể hiện rõ tỷ lệ.

## Keywords đặc trưng
```
- kind='pie'                # (pandas)
- plt.pie()                 # (matplotlib)
- autopct                   # hiển thị phần trăm
- startangle                # góc bắt đầu
- explode                   # tách phần ra
- shadow                    # bóng đổ
- colors                    # màu từng phần
- labels                    # nhãn từng phần
- wedgeprops                # style viền
- donut                     # biểu đồ donut
- center                    # vị trí tâm
```

## Prompt Template

```
Tạo biểu đồ tròn (Pie Chart) bằng [matplotlib/pandas].

Dữ liệu:
- File: [TÊN_FILE.csv/excel/JSON]
- Giá trị: [TÊN_CỘT_GIÁ_TRỊ]
- Nhãn: [TÊN_CỘT_NHÃN / DANH_SÁCH_NHÃN]

Yêu cầu:
- Title: [TIÊU_ĐỀ_BIỂU_ĐỒ]
- Định dạng phần trăm: [%1.1f%% / %1.0f%%]
- Góc bắt đầu: [0/90/180/270]
- Explode: [GIÁ_TRỊ_TÁCH] (0=không, 0.1=tách nhẹ)
- Bóng đổ: [True/False]
- Màu sắc: [DANH_SÁCH_MÀU / PALETTE]
- Viền: [wedgeprops: edgecolor, linewidth]
- Legend: [True/False], vị trí: [best/upper right/...]
- Donut: [True/False], độ rỗng: [0.3-0.7]
- Text style: [fontsize, fontweight]
- Shadow: [True/False]
- Figure size: [WIDTH, HEIGHT]
- DPI: [GIÁ_TRỊ]
- Style: [TÊN_STYLE]
- Save as: [TÊN_FILE.png]
```

## Keywords Matrix

| Mục | Keywords | Giá trị mẫu |
|------|----------|-------------|
| Giá trị | x, sizes | array/list các giá trị |
| Nhãn | labels | list các nhãn |
| Phần trăm | autopct | '%1.1f%%', '%1.0f%%', None |
| Vị trí pct | pctdistance | 0.6, 0.75 (từ tâm ra) |
| Màu | colors | ['#3498db',...], palette name |
| Nhãn ngoài | labelloc | 'outer', 'inside' |
| Góc bắt đầu | startangle | 0, 90, 180, 270, 360 |
| Hướng | counterclock | True, False |
| Tách phần | explode | [0, 0.1, 0, 0], [0.05]*n |
| Bóng đổ | shadow | True, False |
| Viền wedge | wedgeprops | dict(edgecolor, linewidth) |
| Donut | wedgeprops width | 0.5 (80%=donut, 100%=pie) |
| Text style | textprops | dict(fontsize, fontweight) |
| Center | center | (0, 0) |
| Radius | radius | 1 (mặc định), >1 phóng to |
| Tiêu đề | title | fontsize, fontweight |
| Legend | legend | loc, fontsize, title |
| Style | plt.style.use | 'ggplot', 'seaborn-v0_8-whitegrid' |

## Tương tác với các keywords khác

### Khi kết hợp với "donut":
```
- Dùng wedgeprops dict(width=0.5)
- width càng nhỏ → vòng tròn rỗng càng lớn
- Có thể thêm text ở giữa: ax.text(0, 0, 'Total: ...')
- Donut thường đẹp hơn pie chart thông thường
```

### Khi kết hợp với "explode":
```
- Explode cho phần đặc biệt: [0, 0.1, 0, 0]
- Phần 2 được tách ra 10% bán kính
- Thường dùng cho phần lớn nhất hoặc phần cần nhấn mạnh
```

### Khi kết hợp với "autopct":
```
- '%1.1f%%': hiển thị 1 số thập phân
- '%1.0f%%': không có số thập phân
- pctdistance: khoảng cách từ tâm đến text
- textprops: style cho text phần trăm
```

## File code tương ứng
Xem: `charts/codes/06_pie_chart.py`
