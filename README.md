# 重大开饭 · CQU Food Index

[在线查榜](https://wcnz-coder.github.io/cqu-food-guide/) · 学生整理的重庆大学校园饮食指南。

**280 条记录**，涵盖虎溪、沙坪坝 A/B/C 校园及老校区未细分地点。可按校区、榜单、品类、预算、原表来源交叉筛选。搜索支持少量漏字、错字及邻字换序，精准结果优先；筛选状态保存在网址中。

## 来源与清洗

- [重大饭协红黑榜](https://www.kdocs.cn/l/chyey0G2RNBR)：虎溪榜、老校区榜。
- [重庆大学 A 区食堂红黑榜](https://www.kdocs.cn/l/cdGbIddi9s0b)：柏树林、民主湖、一食堂、东林食堂、周边外卖小吃。
- `platforms.json`：逐条记录大众点评、公开美团索引、携程等平台的可核对信息。

发布的 280 条记录对应 286 条原表来源：红榜 154、黑榜 79、争议 47。详情展示脱敏后的学生评价原文及对应单元格，价格取自学生原表。首页主题插画由用户提供。

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

[MIT](LICENSE) 许可证适用于本项目的软件代码。

## 页面与数据口径

- `index.html` 首页，`guide.html` 榜单（「用餐方式」可选不限、校内食堂、外卖），`sources.html` 出处和资料下载。校内食堂按可识别的食堂条目筛选，外卖按原表明示的线索筛选。旧外卖页自动跳到榜单的外卖筛选。
- [原数据 CSV](downloads/source-rows.csv) 是当前收录条目的原表脱敏摘录；测评未标日期留空，采集日期另列。原始工作簿仍由金山共享链接提供。
- `ratings.json` 记录同店平台评分、样本量（公开则注明）及抓取核对日。统一为五分制，跨数据源按 sqrt(评论数) 加权（上限 10，缺样本量取 1）。携程和 Trip.com 不重复计入。无可核验评分明确标出，不用学生红黑榜补分。
- 用餐人数按菜系和餐型推荐，外卖筛选采用原表标签。

## 回归测试（开发时可选，线上不依赖 npm）

Node.js 22.12+ 或 24：

```sh
npm ci
npm test
```

覆盖原数据完整性、搜索、分歧摘要、首页条件抽选、空结果、反馈校验、草稿链接与 JSON 导出。
