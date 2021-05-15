const { DEBUG, LOG_DIR } = require('./constant');

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

function htmlEntityReplace(s) {
    return s
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
}

async function getTiebaPostInfo(tiebaName, maxItem) {
    let tiebaHtml = await fetchTiebaHtml(tiebaName);
    // 去除顶置贴
    const topPostClassRegex = /class="[^">]*thread_top[^">]*"/gs;
    tiebaHtml = tiebaHtml.replace(topPostClassRegex, '');

    // 用于匹配包含但个贴子所有信息的原始html
    const rawPostRegex =
        /<li[^>]*class="[^">]*j_thread_list[^">]*"[^>]*>(.*?)最后回复人:/gs;
    // 用于匹配贴子的各项信息
    const linkAndTitleRegex =
        /<a[^>]*href="(?<relLink>[^">]+)"[^>]*title="(?<rawTitle>[^"]*)"[^>]*class="[^>"]*j_th_tit[^>"]*"[^>]*>/s;
    // const authorRegex = /<span[^>]*title="主题作者:\s(?<author>[^>]+?)"[^>]*>/s;
    const abstractRegex =
        /<div[^>]*class="[^">]*threadlist_abs_onlyline[^">]*"[^>]*>(?<rawAbstract>[^<]*?)</s;
    const imgRegex = /<img[^>]*data-original="(?<imgUrl>[^"]+?)"/gs;
    const imgVideoCoverRegex =
        /<div[^>]*class="[^">]*threadlist_video[^">]*"[^>]*><img src="(?<imgUrl>[^"]+)"/s;

    const info = [];
    const errors = [];
    let execArr;
    while ((execArr = rawPostRegex.exec(tiebaHtml)) !== null && maxItem--) {
        const rawPost = execArr[1];
        try {
            // 获取标题和贴子链接
            const { rawTitle, relLink } =
                rawPost.match(linkAndTitleRegex).groups;
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
            const imgUrls = []; // 可能没有图片
            for (const match of rawPost.matchAll(imgRegex)) {
                imgUrls.push(match.groups.imgUrl);
            }
            // 获取视频的封面
            const { imgUrl: imgVideoCoverUrl } =
                rawPost.match(imgVideoCoverRegex)?.groups ?? {};
            if (imgVideoCoverUrl) {
                imgUrls.push(imgVideoCoverUrl);
            }

            info.push({ title, link, abstract, imgUrls /* author,*/ });
        } catch (err) {
            if (DEBUG) {
                console.log(rawPost);
                console.error(err);
                errors.push({
                    error: { message: err.message, stack: err.stack },
                    rawPost,
                });
            }
        }
    }
    if (DEBUG && errors.length) {
        $file.write({
            data: $data({ string: JSON.stringify(errors) }),
            path: `${LOG_DIR}/get-tieba-post-${tiebaName}-${new Date()}.json`,
        });
    }
    return info.length ? info : null;
}

module.exports = getTiebaPostInfo;
