const getTiebaPost = require('./get-tieba-post');
const doWithTimeout = require('./util/do-with-timeout');

const {
    POST_INFO_TIMEOUT,
    IMAGE_TIMEOUT,
    IMAGE_DOWNLOAD_DIR,
    MAX_NUMBER_OF_POST,
    DEFAULT_REFRESH_CIRCLE,
    MAX_IMAGE_SIZE,
} = require('./constant');

async function selectImageBySize(imgUrls, maxSize, maxNumImg) {
    const selected = [];
    for (let i = 0; i < imgUrls.length && selected.length < maxNumImg; ++i) {
        const url = imgUrls[i];
        const {
            response: { expectedContentLength: len },
        } = await $http.request({ method: 'HEAD', url });

        if (typeof len === 'number' && len <= maxSize) {
            selected.push(url);
        }
    }
    return selected;
}

async function downloadImage(dst, item) {
    if (item.imgDownloaded || item.imgUrls.length === 0) {
        // 图片已经下载完毕或者本就没有图片
        return true;
    } else {
        // 有摘要只显示一张图片，无摘要最多显示三张
        const maxNumImg = item.abstract ? 1 : 3;
        // 只获取较小尺寸的图片，防止超出小组件的资源限制，导致卡死
        let shownImgUrls = await selectImageBySize(
            item.imgUrls,
            MAX_IMAGE_SIZE,
            maxNumImg
        );
        if (!shownImgUrls.length) {
            // 没有符合的图片
            item.imgDownloaded = true;
            return true;
        }
        // 创建imgPaths数组
        if (!item.imgPaths) {
            item.imgDownloaded = false;
            item.imgPaths = [];
        }
        // 去除已经下载的图片
        shownImgUrls = shownImgUrls.filter((url) => {
            const name = url.split('/').slice(-1)[0];
            const path = `${dst}/${name}`;
            if (item.imgPaths.indexOf(path) !== -1) {
                // 图片已经下载且加入到了imgPaths中
                return false;
            }
            if ($file.exists(path)) {
                // 图片之前下载了，但没有在imgPaths中
                item.imgPaths.push(path);
                return false;
            }
            return true;
        });
        try {
            await Promise.all(
                shownImgUrls.map(async (url) => {
                    // download
                    const {
                        response: { statusCode, error },
                        rawData: data,
                    } = await $http.get({ url });
                    if (error) {
                        throw error;
                    }
                    if (statusCode !== 200) {
                        throw new Error(
                            'Image download failed with status code ' +
                                statusCode
                        );
                    }
                    // write to disk
                    const name = url.split('/').slice(-1)[0];
                    const path = `${dst}/${name}`;
                    const success = $file.write({ path, data });
                    if (success) {
                        item.imgPaths.push(path);
                    }
                })
            );
            item.imgDownloaded = true;
            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    }
}

async function tryDownloadAllImageWithTimeout(
    dst,
    items,
    maxTime,
    partialDownloaded
) {
    try {
        if (!partialDownloaded) {
            // check the existence of dst folder
            if (
                !$file.exists(IMAGE_DOWNLOAD_DIR) &&
                !$file.mkdir(IMAGE_DOWNLOAD_DIR)
            ) {
                throw new Error('Failed to create folder for saving image');
            }
            // create dst folder
            if (!$file.exists(dst) && !$file.mkdir(dst)) {
                throw new Error('Failed to create folder for saving image');
            }
            // TODO: clear old images
        }
        const downloadResults = await doWithTimeout(
            () => Promise.allSettled(items.map(downloadImage.bind(null, dst))),
            maxTime
        );
        return downloadResults.every((v) => v === true);
    } catch (e) {
        // 主要为超时
        console.error(e);
        return false;
    }
}

async function tryGetTiebaPostWithTimeout(tiebaName, maxTime, maxNumPost) {
    try {
        return await doWithTimeout(
            getTiebaPost,
            maxTime,
            tiebaName,
            maxNumPost
        );
    } catch (e) {
        // 主要为超时
        console.error(e);
        return null;
    }
}

function isCacheValid(cache, nowDate) {
    return (
        cache &&
        cache.items &&
        cache.date &&
        nowDate - cache.date <
            ($prefs.get('refresh-circle') ?? DEFAULT_REFRESH_CIRCLE) * 60000
    );
}

async function getEntry(tiebaName, forceLoad) {
    if (!tiebaName) {
        return {
            info: null,
            date: null,
        };
    }

    let items = null;
    let date = null;
    const cached = await $cache.getAsync(tiebaName);
    const dst = `${IMAGE_DOWNLOAD_DIR}/${tiebaName}`;
    if (!forceLoad && isCacheValid(cached, new Date())) {
        // use cache
        ({ items, date } = cached);
        if (!cached.imgAllDownloaded) {
            // images are not completely downloaded
            const imgAllDownloaded = await tryDownloadAllImageWithTimeout(
                dst,
                items,
                IMAGE_TIMEOUT,
                true
            );
            // set cache
            $cache.setAsync({
                key: tiebaName,
                value: { items, date, imgAllDownloaded },
            });
        }
    } else {
        // no valid cache
        items = await tryGetTiebaPostWithTimeout(
            tiebaName,
            POST_INFO_TIMEOUT,
            MAX_NUMBER_OF_POST
        );
        if (items) {
            // fetch post successfully
            // set date
            date = new Date();
            // 下载图片
            const imgAllDownloaded = await tryDownloadAllImageWithTimeout(
                dst,
                items,
                IMAGE_TIMEOUT,
                false
            );
            // cache after image downloading
            $cache.setAsync({
                key: tiebaName,
                value: { items, date, imgAllDownloaded },
            });
        } else {
            // use cache if provided, even expired
            if (cached && cached.items && cached.date) {
                ({ items, date } = cached);
            }
        }
    }
    return { info: items, date };
}

module.exports = getEntry;
