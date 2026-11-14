# 重大开饭 · CQU Food Index

[在线查榜](https://wcnz-coder.github.io/cqu-food-guide/) · 重庆大学非官方校园饮食指南。

**291 条记录**，涵盖虎溪、沙坪坝 A/B/C 校园及老校区未细分地点。可按校区、榜单、品类、预算、原表来源交叉筛选。搜索支持少量漏字、错字及邻字换序，精准结果优先；筛选状态保存在网址中。

## 来源与清洗

- [重大饭协红黑榜](https://www.kdocs.cn/l/chyey0G2RNBR)：虎溪榜、老校区榜。
- [重庆大学 A 区食堂红黑榜](https://www.kdocs.cn/l/cdGbIddi9s0b)：柏树林、民主湖、一食堂、东林食堂、周边外卖小吃。
- `platforms.json`：逐条记录大众点评、公开美团索引、携程等平台的可核对信息。饿了么未取得可公开核验的同店数据，不作为评分、价格或销量来源。

原表有效条目 293 条，按分区和清洗后名称/菜品等合并 6 条复记，再加入 4 条未分榜的平台记录。最终：红榜 154、黑榜 79、争议 47、未分榜 11。每条学生记录保留源工作表、单元格和原分榜，不做星级换算；只保留常见口味和分量信号，不公开投稿人或长段未经核实的原话。历史价格不等于当前挂牌价。主题封面为生成配图，不是门店实拍。

## 启动和重建

无需 npm、登录或 API 密钥。启动静态服务器：

~~~sh
python -m http.server 8764
~~~

从上述原链接导出对应 XLSX 后重建数据（原始工作簿不提交）：

~~~sh
python -m pip install -r requirements.txt
python clean.py association.xlsx campus-a.xlsx
node test-data.cjs
~~~

软件代码采用 [MIT](LICENSE)，不包含对第三方原表、评论及商户素材的再授权。
