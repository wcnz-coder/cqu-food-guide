# 重大开饭 · CQU Food Index

[在线查榜](https://wcnz-coder.github.io/cqu-food-guide/) · 重庆大学非官方校园饮食指南。

**280 条记录**，涵盖虎溪、沙坪坝 A/B/C 校园及老校区未细分地点。可按校区、榜单、品类、预算、原表来源交叉筛选。搜索支持少量漏字、错字及邻字换序，精准结果优先；筛选状态保存在网址中。

## 来源与清洗

- [重大饭协红黑榜](https://www.kdocs.cn/l/chyey0G2RNBR)：虎溪榜、老校区榜。
- [重庆大学 A 区食堂红黑榜](https://www.kdocs.cn/l/cdGbIddi9s0b)：柏树林、民主湖、一食堂、东林食堂、周边外卖小吃。
- `platforms.json`：逐条记录大众点评、公开美团索引、携程等平台的可核对信息。饿了么未取得可公开核验的同店数据，不作为评分、价格或销量来源。

发布的 280 条记录对应 286 条原表来源：红榜 154、黑榜 79、争议 47。无法确定榜单的条目不收录。详情保留学生原表的文字评价和对应单元格，不附投稿人或家乡栏；原文内的个人信息予以隐去。没有文字评价的条目明确标注，不用平台摘要补写。历史价格不等于当前挂牌价。首页使用用户提供的卡通头像作为主题插画，不代表重庆大学官方标识。

## 启动和重建

无需 npm、登录或 API 密钥。启动静态服务器：

~~~sh
python -m http.server 8764
~~~

从上述原链接导出对应 XLSX 后重建数据（原始工作簿不提交）：

~~~sh
python -m pip install -r requirements.txt
python clean.py association.xlsx campus-a.xlsx
python build-reviews.py association.xlsx campus-a.xlsx
node test-data.cjs
~~~

软件代码采用 [MIT](LICENSE)，不包含对第三方原表、评论及商户素材的再授权。

## 页面与数据口径

- `index.html` 首页，`guide.html` 榜单（「用餐方式」可选不限、堂食、外卖），`sources.html` 出处和资料下载。堂食按可识别的食堂条目筛选，外卖按原表明示的线索筛选。旧外卖页自动跳到榜单的外卖筛选。
- [原数据 CSV](downloads/source-rows.csv) 是当前收录条目的原表脱敏摘录；测评未标日期留空，采集日期另列。原始工作簿仍由金山共享链接提供。
- `ratings.json` 记录同店平台评分、样本量（公开则注明）及抓取核对日。统一为五分制，跨数据源按 sqrt(评论数) 加权（上限 10，缺样本量取 1）。携程和 Trip.com 不重复计入。无可核验评分明确标出，不用学生红黑榜补分。
- 人数是按菜系和餐型的场景建议，不是可订座位数；外卖线索不是实时接单状态。
