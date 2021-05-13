const mainWidget = require('./main-widget');
const WIDGET_OPTION_PATH = 'widget-options.json';

function loadWidgetOptions() {
    const rawOptions = $file.read(WIDGET_OPTION_PATH).string;
    const options = JSON.parse(rawOptions);
    if (!Array.isArray(options)) {
        return [];
    }
    return options.filter((v) => {
        return (
            typeof v?.name === 'string' &&
            v.name.length &&
            typeof v?.value === 'string' &&
            v.value.length &&
            v.name === v.value + '吧'
        );
    });
}

function saveWidgetOptions(options) {
    return $file.write({
        data: $data({ string: JSON.stringify(options) }),
        path: WIDGET_OPTION_PATH,
    });
}

function mainJSBox() {
    let options;
    try {
        options = loadWidgetOptions();
    } catch (e) {
        console.log(e);
        options = [];
    }

    const onAdd = (newTiebaName) => {
        if (!typeof newTiebaName === 'string' || !newTiebaName.length) {
            return false;
        }
        if (options.some((v) => v.value === newTiebaName)) {
            return false;
        }
        options.push({
            name: newTiebaName + '吧',
            value: newTiebaName,
        });
        $('list').data = options.map((v) => v.name);
        saveWidgetOptions(options);
        return true;
    };

    const onRemove = (deletingIdx) => {
        options = options.filter((_, i) => i !== deletingIdx);
        $('list').delete(deletingIdx);
        saveWidgetOptions(options);
    };

    const onTap = (idx) => {
        mainWidget(options[idx].value, true);
    };

    const onReorder = (from, to) => {
        if (
            from === to ||
            from < 0 ||
            from >= options.length ||
            to < 0 ||
            to >= options.length
        ) {
            return;
        }
        if (from < to) {
            options = [
                ...options.slice(0, from),
                ...options.slice(from + 1, to + 1),
                options[from],
                ...options.slice(to + 1),
            ];
        } else {
            options = [
                ...options.slice(0, to),
                options[from],
                ...options.slice(to, from),
                ...options.slice(from + 1),
            ];
        }
        saveWidgetOptions(options);
    };

    $ui.render({
        props: { title: '贴吧小组件' },
        views: [
            renderPreferences(),
            renderTiebaEditingView(onAdd),
            renderTiebaList(options, onRemove, onTap, onReorder),
        ],
    });
}

function renderTiebaList(options, onRemove, onTap, onReorder) {
    let reorderFrom, reorderTo;
    return {
        type: 'list',
        props: {
            data: options.map((v) => v.name),
            reorder: true,
            actions: [
                {
                    title: '删除',
                    color: $color('red'),
                    handler: (_sender, indexPath) => {
                        onRemove(indexPath.row);
                    },
                },
            ],
        },
        layout: (make, view) => {
            make.top.equalTo(view.prev.bottom);
            make.left.bottom.right.equalTo(view.super);
        },
        events: {
            didSelect: (_sender, indexPath) => onTap(indexPath.row),
            reorderBegan: (indexPath) => {
                reorderFrom = indexPath.row;
                reorderTo = indexPath.row;
            },
            reorderMoved: (_fromIndexPath, toIndexPath) => {
                reorderTo = toIndexPath.row;
            },
            reorderFinished: () => onReorder(reorderFrom, reorderTo),
        },
    };
}

function renderToggle(title, initialStatus, onChange, layout) {
    return {
        type: 'view',
        views: [
            {
                type: 'label',
                props: { text: title },
                layout: (make, view) => {
                    make.leading.equalTo(view.super);
                    make.centerY.equalTo(view.super);
                },
            },
            {
                type: 'switch',
                props: { on: initialStatus },
                events: { changed: onChange },
                layout: (make, view) => {
                    make.leading.equalTo(view.prev.trailing).offset(20);
                    make.centerY.equalTo(view.super);
                },
            },
        ],
        events: { changed: onChange },
        layout,
    };
}

function renderSlider(title, unit, initial, min, max, onChange, layout) {
    const titleLabelID = `slider-title-label-of-${title}`;
    return {
        type: 'view',
        views: [
            {
                type: 'label',
                props: {
                    id: titleLabelID,
                    font: $font(13),
                    text: `${title}(${initial}${unit})`,
                },
                layout: (make, view) => {
                    make.top.centerX.equalTo(view.super);
                },
            },
            {
                type: 'label',
                props: {
                    text: `${min}${unit}`,
                    color: $color('secondaryText'),
                    font: $font(11),
                },
                layout: (make, view) => {
                    make.top.equalTo(view.prev.bottom).offset(15);
                    make.leading.inset(10);
                },
            },
            {
                type: 'label',
                props: {
                    text: `${max}${unit}`,
                    color: $color('secondaryText'),
                    font: $font(11),
                },
                layout: (make, view) => {
                    make.top.equalTo(view.prev);
                    make.trailing.inset(10);
                },
            },
            {
                type: 'slider',
                props: { value: initial, min, max },
                events: {
                    changed: (sender) => {
                        const newVal = onChange(sender);
                        if (typeof newVal !== 'number') {
                            return;
                        }
                        $(titleLabelID).text = `${title}(${newVal}${unit})`;
                    },
                },
                layout: (make, view) => {
                    make.centerY.equalTo(view.prev);
                    make.leading.equalTo(view.prev.prev.trailing).offset(5);
                    make.trailing.equalTo(view.prev.leading).offset(-5);
                },
            },
        ],
        events: { changed: onChange },
        layout,
    };
}

function renderPreferences() {
    return {
        type: 'view',
        views: [
            renderToggle(
                '点击后跳转到Safari',
                !!$prefs.get('open-in-safari'),
                (sender) => {
                    $prefs.set('open-in-safari', sender.on);
                },
                (make, view) => {
                    make.size.equalTo($size(210, 60));
                    make.top.equalTo(view.super);
                    make.centerX.equalTo(view.super);
                }
            ),
            renderSlider(
                '刷新周期',
                '分钟',
                $prefs.get('refresh-circle') ?? 30,
                1,
                120,
                (sender) => {
                    const newVal = Math.round(sender.value / 5) * 5 || 1;
                    $prefs.set('refresh-circle', newVal);
                    return newVal;
                },
                (make, view) => {
                    make.size.equalTo($size(350, 60));
                    make.width.lessThanOrEqualTo(view.super);
                    make.top.equalTo(view.prev.bottom);
                    make.centerX.equalTo(view.super);
                }
            ),
        ],
        layout: (make, view) => {
            make.height.equalTo(120);
            make.width.equalTo(view.super);
            make.top.equalTo(view.super);
            make.centerX.equalTo(view.super);
        },
    };
}

function renderTiebaEditingView(onAdd) {
    return {
        type: 'view',
        layout: (make, view) => {
            make.height.equalTo(60);
            make.width.equalTo(view.super);
            make.top.equalTo(view.prev.bottom);
            make.centerX.equalTo(view.super);
        },
        views: [
            renderTiebaEditingInput(onAdd),
            renderTiebaEditingAddButton(onAdd),
        ],
    };
}

function renderTiebaEditingInput(onAdd) {
    return {
        type: 'input',
        props: { placeholder: '贴吧名' },
        layout: (make, view) => {
            make.size.equalTo($size(130, 40));
            make.centerY.equalTo(view.super);
            make.centerX.equalTo(view.super).offset(-40);
        },
        events: {
            returned: (sender) => {
                const tiebaName = sender.text.trim();
                if (onAdd(tiebaName)) {
                    sender.text = '';
                }
            },
        },
    };
}

function renderTiebaEditingAddButton(onAdd) {
    return {
        type: 'button',
        props: { title: '添加' },
        layout: (make, view) => {
            make.left.equalTo(view.prev.right).offset(20);
            make.centerY.equalTo(view.super);
            make.size.equalTo($size(60, 40));
        },
        events: {
            tapped: () => {
                const tiebaName = $('input').text.trim();
                if (onAdd(tiebaName)) {
                    $('input').text = '';
                }
            },
        },
    };
}

module.exports = mainJSBox;
