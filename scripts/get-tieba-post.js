async function fetchTiebaHtml(tiebaName) {
    const tiebaURL = `https://tieba.baidu.com/f?kw=${encodeURIComponent(
        tiebaName
    )}&ie=utf-8`;

    const { error, data: tiebaHtml } = await $http.get({ url: tiebaURL });
    if (error) {
        throw error;
    }
    if (!tiebaHtml || typeof tiebaHtml !== 'string') {
        throw new Error(`No readable data from ${tiebaURL}`);
    }
    return tiebaHtml;
}

// 使用cheerio会导致小组件卡死，可能是因为cpu超时
// async function getTiebaPostInfo(tiebaName) {
//     const tiebaHtml = await fetchTiebaHtml(tiebaName);
//     const $$ = cheerio.load(tiebaHtml);
//     // 获取各项信息
//     return $$('ul#thread_list>li.j_thread_list') // 必须使用“>”获取直接子元素，否则会包含顶置贴
//         .map((_idx, elem) => ({
//             title: $$('a.j_th_tit', elem).text().trim(),
//             link:
//                 'https://tieba.baidu.com' + $$('a.j_th_tit', elem).attr('href'),
//             author: $$('span.tb_icon_author', elem).attr('title').slice(6),
//             abstract: $$('.threadlist_abs', elem).text().trim(),
//             imgUrl: $$('.threadlist_media img', elem).data('original'),
//         }))
//         .get();
// }

function htmlEntityReplace(s) {
    return s
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
}

async function getTiebaPostInfo(tiebaName) {
    let tiebaHtml = await fetchTiebaHtml(tiebaName);
    // 去除顶置贴
    const topPostClassRegex = /class="[^">]*thread_top[^">]*"/gs;
    tiebaHtml = tiebaHtml.replace(topPostClassRegex, '');

    // 用于匹配包含但个贴子所有信息的原始html
    const rawPostRegex = /<li[^>]*class="[^">]*j_thread_list[^">]*"[^>]*>(.*?)最后回复人:/gs;
    // 用于匹配贴子的各项信息
    const linkAndTitleRegex = /<a[^>]*href="(?<relLink>[^">]+)"[^>]*class="[^>"]*j_th_tit[^>"]*"[^>]*>(?<rawTitle>[^<]+?)</s;
    // const authorRegex = /<span[^>]*title="主题作者:\s(?<author>[^>]+?)"[^>]*>/s;
    const abstractRegex = /<div[^>]*class="[^">]*threadlist_abs_onlyline[^">]*"[^>]*>(?<rawAbstract>[^<]*?)</s;
    const imgRegex = /<img[^>]*data-original="(?<imgUrl>[^"]+?)"/gs;

    const info = [];
    let execArr;
    while ((execArr = rawPostRegex.exec(tiebaHtml)) !== null) {
        const rawPost = execArr[1];
        // 获取标题和贴子链接
        const { rawTitle, relLink } = rawPost.match(linkAndTitleRegex).groups;
        // 去掉html字符实体
        const title = htmlEntityReplace(rawTitle);
        const link = 'https://tieba.baidu.com' + relLink;
        // 获取贴子作者
        // const { author } = rawPost.match(authorRegex);
        // 获取贴子摘要
        const { rawAbstract } = rawPost.match(abstractRegex)?.groups ?? {};
        let abstract = null;
        if (rawAbstract) {
            abstract = rawAbstract.trim();
            // 去掉html字符实体
            abstract = htmlEntityReplace(abstract);
            abstract = abstract.length ? abstract : null;
        }
        // 获取贴子封面照片
        // TODO: 获取视频的封面
        const imgUrls = []; // 可能没有图片
        for (const match of rawPost.matchAll(imgRegex)) {
            imgUrls.push(match.groups.imgUrl);
        }

        info.push({ title, link, abstract, imgUrls /* author,*/ });
    }
    return info.length ? info : null;
}

module.exports = getTiebaPostInfo;
