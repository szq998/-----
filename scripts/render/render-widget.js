const renderBackground = require('./render-background');
const getLinkOpenedInJSBox = require('../util/get-link-opened-in-jsbox');

const {
    TITLE_FONT_SIZE,
    ABSTRACT_FONT_SIZE,
    IMAGE_HEIGHT,
    BG_CONTENT_OPACITY_LIGHT,
    BG_CONTENT_OPACITY_DARK,
    TITLE_DETAIL_SPACING,
    TITLE_MINIMUM_SCALE_FACTOR,
} = require('../constant');

function renderWidget(tiebaName, link, ctx, geometry) {
    const {
        entry: { info: items, date },
        family,
    } = ctx;
    const widgetURL = $prefs.get('open-in-safari')
        ? link
        : getLinkOpenedInJSBox(link);
    return {
        type: 'zstack',
        props: { widgetURL },
        views: [
            renderBackground(ctx),
            renderUpdatingTime(date, ctx),
            renderPosts(items, tiebaName, family, geometry),
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

function renderPosts(items, tiebaName, family, geometry) {
    const { itemPerColumn, numColumn, itemWidth, itemHeight } = geometry;
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
    const { title, link, abstract, imgPaths } = item; // imgPaths可能不存在
    // 没有摘要和图片时，标题最多可以有两行
    const titleLineLimit = abstract || imgPaths?.length ? 1 : 2;
    return {
        type: 'vstack',
        props: {
            spacing: TITLE_DETAIL_SPACING,
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
            minimumScaleFactor: TITLE_MINIMUM_SCALE_FACTOR,
        },
    };
}

function renderItemDetail(abstract, imgPaths = null) {
    if (abstract) {
        return {
            type: 'hstack',
            props: {
                spacing: 3,
                frame: { maxWidth: Infinity },
            },
            views: [
                renderItemDetailAbstract(abstract),
                imgPaths ? renderItemDetailImage(imgPaths[0]) : null,
                // only one image
            ].filter((v) => v !== null),
        };
    } else if (imgPaths?.length) {
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
            views: [
                space,
                ...imgPaths.slice(0, 3).map(renderItemDetailImage),
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
                height: IMAGE_HEIGHT,
                alignment: $widget.alignment.topLeading,
            },
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

module.exports = renderWidget;
