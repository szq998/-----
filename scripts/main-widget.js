const getTiebaPost = require('./get-tieba-post');
const doWithTimeout = require('./do-with-timeout');

const OPEN_IN_SAFARI = !!$prefs.get('open-in-safari');

const TITLE_FONT_SIZE = 13;
const IMAGE_HEIGHT = 26;
const ABSTRACT_FONT_SIZE = 10;

const ITEM_PADDING = 1.5;
const ITEM_CONTENT_HEIGHT = TITLE_FONT_SIZE + IMAGE_HEIGHT;
const ITEM_HEIGHT = ITEM_CONTENT_HEIGHT + ITEM_PADDING * 2;

const BG_CONTENT_OPACITY_LIGHT = 0.1;
const BG_CONTENT_OPACITY_DARK = 0.15;

const tiebaName = $widget.inputValue;

async function mainWidget() {
    let items = null;
    let date = null;
    try {
        if (!tiebaName) {
            throw new Error('No Tieba name provided');
        }
        items = await doWithTimeout(getTiebaPost, 10000, tiebaName);
        date = new Date();
        $cache.setAsync({
            key: tiebaName,
            value: { items, date },
        });
    } catch (e) {
        console.error(e);
        if (tiebaName) {
            const cached = await $cache.getAsync(tiebaName);
            if (cached && cached.items && cached.date) {
                ({ items, date } = cached);
            }
        }
    }

    const entry = {
        info: items,
        date,
    };
    $widget.setTimeline({
        entries: [entry],
        policy: { atEnd: true },
        render: (ctx) => {
            const {
                entry: { info: items, date },
                displaySize,
                family,
            } = ctx;

            if (!Array.isArray(items)) {
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

            const itemPerColumn = Math.floor(
                (displaySize.height - 5) / ITEM_HEIGHT
            );
            const numColumn = family === 0 ? 1 : 2;
            const itemWidth =
                (displaySize.width - 10 * (2 + numColumn - 1)) / numColumn;

            const link = `https://tieba.baidu.com/f?kw=${encodeURIComponent(
                tiebaName
            )}&ie=utf-8`;

            const fixedItem = {
                type: 'text',
                props: {
                    text: tiebaName + '吧',
                    frame: {
                        width: itemWidth,
                    },
                    font: $font('bold', family === 2 ? 26 : 20),
                    minimumScaleFactor: 0.3,
                },
            };

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
                        fixedItem,
                        items,
                        itemPerColumn,
                        numColumn,
                        itemWidth
                    ),
                ],
            };
        },
    });
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

function renderPosts(fixedItem, items, itemPerColumn, numColumn, itemWidth) {
    return {
        type: 'hgrid',
        props: {
            rows: Array(itemPerColumn).fill({
                fixed: ITEM_HEIGHT,
                spacing: 0,
            }),
            spacing: 10,
        },
        views: [
            ...items
                .slice(0, itemPerColumn * numColumn - 1)
                .map(renderItem.bind(null, itemWidth)),
            fixedItem,
        ],
    };
}

function renderItem(itemWidth, item) {
    const { title, link, abstract, imgUrls } = item;
    return {
        type: 'vstack',
        props: {
            spacing: 0,
            link: OPEN_IN_SAFARI ? link : getLinkOpenedInJSBox(link),
            frame: {
                maxWidth: Infinity,
                height: ITEM_HEIGHT,
                width: itemWidth,
                alignment: $widget.alignment.leading,
            },
        },
        views: [renderItemTitle(title), renderItemDetail(abstract, imgUrls)],
    };
}

function renderItemTitle(title) {
    return {
        type: 'text',
        props: {
            text: title,
            font: $font('bold', TITLE_FONT_SIZE),
            color: $color('#444', '#eee'),
            lineLimit: 1,
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
    return {
        type: 'hstack',
        props: {
            spacing: 3,
            frame: {
                maxWidth: Infinity,
                alignment:
                    shownImgUrls.length > 1
                        ? $widget.alignment.center
                        : $widget.alignment.trailing,
            },
        },
        views: [
            abstract ? renderItemDetailAbstract(abstract) : null,
            ...shownImgUrls.map(renderItemDetailImage),
        ].filter((v) => v !== null),
    };
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
