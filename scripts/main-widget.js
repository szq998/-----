const getTiebaPost = require('./get-tieba-post');
const doWithTimeout = require('./do-with-timeout');

const TITLE_FONT_SIZE = 13;
const IMAGE_HEIGHT = 26;
const ABSTRACT_FONT_SIZE = 10;

const MIN_ITEM_MARGIN = 1.5;
const ITEM_CONTENT_HEIGHT = TITLE_FONT_SIZE + IMAGE_HEIGHT;
const MIN_ITEM_HEIGHT = ITEM_CONTENT_HEIGHT + MIN_ITEM_MARGIN * 2;

const WIDGET_TOP_BOTTOM_MARGIN = 7;

const BG_CONTENT_OPACITY_LIGHT = 0.1;
const BG_CONTENT_OPACITY_DARK = 0.15;

const IMAGE_DOWNLOAD_DIR = 'assets/post-images';

async function mainWidget(tiebaName = $widget.inputValue, forceLoad = false) {
    $widget.setTimeline({
        entries: [await getEntry(tiebaName, forceLoad)],
        policy: { atEnd: true },
        render: (ctx) => {
            const {
                entry: { info: items, date },
                displaySize,
                family,
            } = ctx;

            if (!Array.isArray(items)) {
                return renderError(tiebaName, ctx);
            }

            // estimate number of items pre column
            // and item height
            const [itemPerColumn, itemHeight] =
                estimateItemPerColumnAndItemHeight(displaySize.height);

            const numColumn = family === 0 ? 1 : 2;
            const itemWidth =
                (displaySize.width - 10 * (2 + numColumn - 1)) / numColumn;

            const link = `https://tieba.baidu.com/f?kw=${encodeURIComponent(
                tiebaName
            )}&ie=utf-8`;

            return {
                type: 'zstack',
                props: {
                    widgetURL: $prefs.get('open-in-safari')
                        ? link
                        : getLinkOpenedInJSBox(link),
                },
                views: [
                    renderBackground(ctx),
                    renderUpdatingTime(date, ctx),
                    renderPosts(
                        items,
                        itemPerColumn,
                        numColumn,
                        itemWidth,
                        itemHeight,
                        family,
                        tiebaName
                    ),
                ],
            };
        },
    });
}

function estimateItemPerColumnAndItemHeight(widgetHeight) {
    let itemPerColumn = Math.floor(widgetHeight / MIN_ITEM_HEIGHT);
    // estimate the space left
    let remainingSpace = widgetHeight - itemPerColumn * MIN_ITEM_HEIGHT;
    // make sure enough margin in the top and bottom of widget
    if (remainingSpace < WIDGET_TOP_BOTTOM_MARGIN * 2) {
        --itemPerColumn;
        remainingSpace += MIN_ITEM_HEIGHT;
    }
    const extraRemainingSpace = remainingSpace - WIDGET_TOP_BOTTOM_MARGIN * 2;
    // distribute the extra remaining space
    const itemMargin =
        MIN_ITEM_MARGIN + extraRemainingSpace / itemPerColumn / 2;
    const itemHeight = ITEM_CONTENT_HEIGHT + itemMargin * 2;
    return [itemPerColumn, itemHeight];
}

async function downloadImage(dst, item) {
    if (item.imgDownloaded || item.imgUrls.length === 0) {
        // 图片已经下载完毕或者本就没有图片
        return true;
    } else {
        // 有摘要只显示一张图片，无摘要最多显示三张
        const shownImgUrls = item.abstract
            ? item.imgUrls.slice(0, 1)
            : item.imgUrls.slice(0, 3);
        // 忽略已下载的照片（不保持照片顺序）
        item.imgPaths.forEach(() => shownImgUrls.pop());
        try {
            await Promise.all(
                shownImgUrls.map(async (url) => {
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
    if (!partialDownloaded) {
        // check the existence of dst folder
        if (
            !$file.exists(IMAGE_DOWNLOAD_DIR) &&
            !$file.mkdir(IMAGE_DOWNLOAD_DIR)
        ) {
            throw new Error('Failed to create folder for saving image');
        }
        // delete old images
        $file.delete(dst);
        // create dst folder
        if (!$file.mkdir(dst)) {
            throw new Error('Failed to create folder for saving image');
        }
    }
    try {
        const downloadResults = await doWithTimeout(
            () => Promise.allSettled(items.map(downloadImage.bind(null, dst))),
            maxTime
        );
        return downloadResults.every((v) => v === true);
    } catch (e) {
        console.error(e);
        return false;
    }
}

function isCacheValid(cache, nowDate) {
    return (
        cache &&
        cache.items &&
        cache.date &&
        nowDate - cache.date < ($prefs.get('refresh-circle') ?? 30) * 60000
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
    try {
        if (!forceLoad && isCacheValid(cached, new Date())) {
            // use cache
            ({ items, date } = cached);
            if (!cached.imgAllDownloaded) {
                // images are not completely downloaded
                const imgAllDownloaded = await tryDownloadAllImageWithTimeout(
                    dst,
                    items,
                    10000,
                    true
                );
                // set cache
                $cache.setAsync({
                    key: tiebaName,
                    value: { items, date, imgAllDownloaded },
                });
            }
        } else {
            // 获取贴子信息
            items = await doWithTimeout(getTiebaPost, 10000, tiebaName);
            // 截取部分，为了降低下载图片的开销
            items = items.slice(0, 20);
            // set date
            date = new Date();
            // prepare to download images
            items.forEach((v) => {
                v.imgDownloaded = false;
                v.imgPaths = [];
            });
            $cache.setAsync({
                key: tiebaName,
                value: { items, date, imgAllDownloaded: false },
            });
            // 下载图片
            const imgAllDownloaded = await tryDownloadAllImageWithTimeout(
                dst,
                items,
                10000,
                false
            );
            // set cache
            $cache.setAsync({
                key: tiebaName,
                value: { items, date, imgAllDownloaded },
            });
        }
    } catch (e) {
        console.error(e);
        if (cached && cached.items && cached.date) {
            ({ items, date } = cached);
        }
    }

    return { info: items, date };
}

function renderError(tiebaName, ctx) {
    return {
        type: 'zstack',
        props: {
            widgetURL: `jsbox://run?name=${encodeURIComponent(
                $addin.current.name
            )}`,
        },
        views: [
            renderBackground(ctx),
            {
                type: 'text',
                props: {
                    padding: 15,
                    minimumScaleFactor: 0.5,
                    text: tiebaName
                        ? `"${tiebaName}吧"加载失败\n请检查网络连接和贴吧名`
                        : `使用方法：\n    1. 点击进入主应用\n    2. 添加贴吧\n    3. 回到主屏幕\n    4. 长按编辑小组件\n    5. 在输入参数中选择要展示的贴吧`,
                },
            },
        ],
    };
}

function renderFixedItem(family, itemWidth, tiebaName) {
    return {
        type: 'text',
        props: {
            text: tiebaName + '吧',
            frame: { width: itemWidth },
            font: $font('bold', family === 2 ? 26 : 20),
            minimumScaleFactor: 0.3,
        },
    };
}

function renderBackground() {
    return {
        type: 'gradient',
        props: {
            startPoint: $point(0, 0),
            endPoint: $point(0, 1),
            colors: [
                $color('#BDD5FA', '#4842C2'),
                $color('#6FA5F6', '#37149B'),
            ],
        },
    };
}

function renderUpdatingTime(date, { family, isDarkMode }) {
    const opacity = isDarkMode
        ? BG_CONTENT_OPACITY_DARK
        : BG_CONTENT_OPACITY_LIGHT;
    const fontSize = family === 0 ? 45 : family === 1 ? 70 : 90;
    return {
        type: 'vstack',
        views: [
            {
                type: 'text',
                props: {
                    text: '更新于',
                    opacity,
                },
            },
            {
                type: 'text',
                props: {
                    text:
                        String(date.getHours()).padStart(2, '0') +
                        ':' +
                        String(date.getMinutes()).padStart(2, '0'),
                    font: $font('bold', fontSize),
                    opacity,
                },
            },
        ],
    };
}

function renderPosts(
    items,
    itemPerColumn,
    numColumn,
    itemWidth,
    itemHeight,
    family,
    tiebaName
) {
    return {
        type: 'hgrid',
        props: {
            rows: Array(itemPerColumn).fill({
                fixed: itemHeight,
                spacing: 0,
            }),
            spacing: 10,
        },
        views: [
            // 最小尺寸下，贴吧名放在顶部
            family === 0 ? renderFixedItem(family, itemWidth, tiebaName) : null,
            ...items
                .slice(0, itemPerColumn * numColumn - 1)
                .map(renderItem.bind(null, itemWidth, itemHeight)),
            // 其他尺寸下，贴吧名放在末尾
            family !== 0 ? renderFixedItem(family, itemWidth, tiebaName) : null,
        ].filter((v) => v !== null),
    };
}

function renderItem(itemWidth, itemHeight, item) {
    const { title, link, abstract, imgPaths } = item;
    // 没有摘要和图片时，标题最多可以有两行
    const titleLineLimit = abstract || imgPaths.length ? 1 : 2;
    return {
        type: 'vstack',
        props: {
            spacing: 1.5,
            link: $prefs.get('open-in-safari')
                ? link
                : getLinkOpenedInJSBox(link),
            frame: {
                maxWidth: Infinity,
                height: itemHeight,
                width: itemWidth,
                alignment: $widget.alignment.leading,
            },
        },
        views: [
            renderItemTitle(title, titleLineLimit),
            renderItemDetail(abstract, imgPaths),
        ].filter((v) => v !== null),
    };
}

function renderItemTitle(title, lineLimit) {
    return {
        type: 'text',
        props: {
            text: title,
            font: $font('bold', TITLE_FONT_SIZE),
            color: $color('#444', '#eee'),
            lineLimit,
            frame: {
                maxWidth: Infinity,
                alignment: $widget.alignment.leading,
            },
            minimumScaleFactor: 0.8,
        },
    };
}

function renderItemDetail(abstract, imgPaths) {
    if (abstract) {
        return {
            type: 'hstack',
            props: {
                spacing: 3,
                frame: { maxWidth: Infinity },
            },
            views: [
                renderItemDetailAbstract(abstract),
                ...imgPaths.map(renderItemDetailImage),
                // only one image
            ],
        };
    } else if (imgPaths.length) {
        const imgLen = imgPaths.length;
        // 当显示2张图片时，内容是靠前(leading)堆放，使用spacer制造缩进
        const space =
            imgLen === 2
                ? {
                      type: 'spacer',
                      props: { frame: { width: 0 } }, // 0宽，缩进实际来源于hstack的spacing
                  }
                : null;
        return {
            type: 'hstack',
            props: {
                spacing: imgLen === 3 ? 5 : 10,
                frame: {
                    maxWidth: Infinity,
                    alignment:
                        // 一张图片时，靠后(trailing)堆放；两张图片时，靠前(leading)堆放；三张图片时，居中
                        imgLen === 1
                            ? $widget.alignment.trailing
                            : imgLen === 2
                            ? $widget.alignment.leading
                            : $widget.alignment.center,
                },
            },
            views: [space, ...imgPaths.map(renderItemDetailImage)].filter(
                (v) => v !== null
            ),
        };
    } else {
        return null;
    }
}

function renderItemDetailAbstract(abstract) {
    return {
        type: 'text',
        props: {
            text: abstract,
            font: $font(ABSTRACT_FONT_SIZE),
            color: $color('#444', '#eee'),
            lineLimit: 2,
            frame: {
                maxWidth: Infinity,
                height: IMAGE_HEIGHT,
                alignment: $widget.alignment.topLeading,
            },
            minimumScaleFactor: 0.8,
        },
    };
}

function renderItemDetailImage(imgPath) {
    return {
        type: 'image',
        props: {
            cornerRadius: 3,
            // symbol will be shown only when image failed to load
            symbol: {
                glyph: 'exclamationmark.icloud',
                size: 64, // big size because symbol will be scale
                weight: 'ultraLight',
            },
            path: imgPath,
            resizable: true,
            scaledToFill: true,
            frame: {
                width: IMAGE_HEIGHT * (3 / 2),
                height: IMAGE_HEIGHT,
            },
        },
    };
}

function getLinkOpenedInJSBox(url) {
    const script = `$safari.open('${url}')`;
    return `jsbox://run?script=${encodeURIComponent(script)}`;
}

module.exports = mainWidget;
