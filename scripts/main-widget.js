const getTiebaPost = require('./get-tieba-post');
const doWithTimeout = require('./do-with-timeout');

const OPEN_IN_SAFARI = !!$prefs.get('open-in-safari');

const TITLE_FONT_SIZE = 13;
const IMAGE_HEIGHT = 26;
const ABSTRACT_FONT_SIZE = 10;

const MIN_ITEM_MARGIN = 1.5;
const ITEM_CONTENT_HEIGHT = TITLE_FONT_SIZE + IMAGE_HEIGHT;
const MIN_ITEM_HEIGHT = ITEM_CONTENT_HEIGHT + MIN_ITEM_MARGIN * 2;

const WIDGET_TOP_BOTTOM_MARGIN = 7;

const BG_CONTENT_OPACITY_LIGHT = 0.1;
const BG_CONTENT_OPACITY_DARK = 0.15;

const tiebaName = $widget.inputValue;

async function mainWidget() {
    $widget.setTimeline({
        entries: [await fetchEntryWithCache()],
        policy: { atEnd: true },
        render: (ctx) => {
            const {
                entry: { info: items, date },
                displaySize,
                family,
            } = ctx;

            if (!Array.isArray(items)) {
                return renderError(ctx);
            }

            // estimate number of items pre column
            // and item height
            const [
                itemPerColumn,
                itemHeight,
            ] = estimateItemPerColumnAndItemHeight(displaySize.height);

            const numColumn = family === 0 ? 1 : 2;
            const itemWidth =
                (displaySize.width - 10 * (2 + numColumn - 1)) / numColumn;

            const link = `https://tieba.baidu.com/f?kw=${encodeURIComponent(
                tiebaName
            )}&ie=utf-8`;

            return {
                type: 'zstack',
                props: {
                    widgetURL: OPEN_IN_SAFARI
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
                        family
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

async function fetchEntryWithCache() {
    let items = null;
    let date = null;
    try {
        // if tiebaName set
        if (!tiebaName) {
            throw new Error('No Tieba name provided');
        }
        // if latest update happened in a minute
        const cached = await $cache.getAsync(tiebaName);
        if (
            cached &&
            cached.items &&
            cached.date &&
            new Date() - cached.date < 60000
        ) {
            ({ items, date } = cached);
        } else {
            items = await doWithTimeout(getTiebaPost, 10000, tiebaName);
            date = new Date();
            $cache.setAsync({
                key: tiebaName,
                value: { items, date },
            });
        }
    } catch (e) {
        console.error(e);
        if (tiebaName) {
            const cached = await $cache.getAsync(tiebaName);
            if (cached && cached.items && cached.date) {
                ({ items, date } = cached);
            }
        }
    }
    return {
        info: items,
        date,
    };
}

function renderError(ctx) {
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

function renderFixedItem(family, itemWidth) {
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
    family
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
            family === 0 ? renderFixedItem(family, itemWidth) : null,
            ...items
                .slice(0, itemPerColumn * numColumn - 1)
                .map(renderItem.bind(null, itemWidth, itemHeight)),
            // 其他尺寸下，贴吧名放在末尾
            family !== 0 ? renderFixedItem(family, itemWidth) : null,
        ].filter((v) => v !== null),
    };
}

function renderItem(itemWidth, itemHeight, item) {
    const { title, link, abstract, imgUrls } = item;
    // 没有摘要和图片时，标题最多可以有两行
    const titleLineLimit = abstract || imgUrls.length ? 1 : 2;
    return {
        type: 'vstack',
        props: {
            spacing: 1.5,
            link: OPEN_IN_SAFARI ? link : getLinkOpenedInJSBox(link),
            frame: {
                maxWidth: Infinity,
                height: itemHeight,
                width: itemWidth,
                alignment: $widget.alignment.leading,
            },
        },
        views: [
            renderItemTitle(title, titleLineLimit),
            renderItemDetail(abstract, imgUrls),
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

function renderItemDetail(abstract, imgUrls) {
    const shownImgUrls = abstract ? imgUrls.slice(0, 1) : imgUrls.slice(0, 3);
    if (abstract) {
        return {
            type: 'hstack',
            props: {
                spacing: 3,
                frame: { maxWidth: Infinity },
            },
            views: [
                renderItemDetailAbstract(abstract),
                ...shownImgUrls.map(renderItemDetailImage), // only one image
            ],
        };
    } else if (shownImgUrls.length) {
        const imgLen = shownImgUrls.length;
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
            views: [
                space,
                ...shownImgUrls.map(renderItemDetailImage), // only one image
            ].filter((v) => v !== null),
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
                alignment: $widget.alignment.leading,
            },
            minimumScaleFactor: 0.8,
        },
    };
}

function renderItemDetailImage(imgUrl) {
    return {
        type: 'image',
        props: {
            cornerRadius: 3,
            uri: imgUrl,
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
