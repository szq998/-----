const getEntry = require('./get-entry');
const renderWidget = require('./render/render-widget');
const renderError = require('./render/render-error');

const {
    MIN_ITEM_MARGIN,
    ITEM_CONTENT_HEIGHT,
    MIN_ITEM_HEIGHT,
    WIDGET_TOP_BOTTOM_MARGIN,
    DEFAULT_REFRESH_CIRCLE,
} = require('./constant');

async function mainWidget(tiebaName = $widget.inputValue, forceLoad = false) {
    const entry = await getEntry(tiebaName, forceLoad);
    const policy = {};
    const lastUpdatingDate = entry.date;
    if (lastUpdatingDate) {
        policy.afterDate = new Date(
            lastUpdatingDate.valueOf() +
                ($prefs.get('refresh-circle') ?? DEFAULT_REFRESH_CIRCLE) * 60000
        );
    } else {
        policy.atEnd = true;
    }

    $widget.setTimeline({
        policy,
        entries: [entry],
        render: (ctx) => {
            const {
                entry: { info: items },
                displaySize,
                family,
            } = ctx;

            if (!items) {
                return renderError(tiebaName, ctx);
            }
            // estimate number of items pre column
            // and item height
            const [itemPerColumn, itemHeight] =
                estimateItemPerColumnAndItemHeight(displaySize.height);

            const numColumn = family === 0 ? 1 : 2;
            const itemWidth =
                (displaySize.width - 10 * (2 + numColumn - 1)) / numColumn;

            const geometry = {
                itemPerColumn,
                numColumn,
                itemWidth,
                itemHeight,
            };

            const link = `https://tieba.baidu.com/f?kw=${encodeURIComponent(
                tiebaName
            )}&ie=utf-8`;

            return renderWidget(tiebaName, link, ctx, geometry);
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

module.exports = mainWidget;
