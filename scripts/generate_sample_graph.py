import numpy as np
import matplotlib.pyplot as plt

# Data points
x = np.array([1, 2, 3, 4, 5])
y_blue   = np.array([4.0, 6.0, 7.2, 8.1, 9.0])
y_orange = np.array([5.0, 6.8, 8.1, 9.2, 10.1])
y_green  = np.array([6.0, 7.9, 9.7, 11.0, 12.2])
y_red    = np.array([7.0, 9.0, 10.8, 12.5, 14.0])

samples = {
    'Blue':   (y_blue,   plt.cm.tab10(0)),
    'Orange': (y_orange, plt.cm.tab10(1)),
    'Green':  (y_green,  plt.cm.tab10(2)),
    'Red':    (y_red,    plt.cm.tab10(3)),
}

plt.figure(figsize=(6, 5))

for name, (y_vals, color) in samples.items():
    plt.plot(
        x, y_vals,
        marker='s',
        color=color,
        linestyle='-',
        markersize=7,
        markeredgecolor='black',
        markeredgewidth=0.6,
        label=name
    )

ax = plt.gca()

# 1 pt black box
for spine in ax.spines.values():
    spine.set_visible(True)
    spine.set_color('black')
    spine.set_linewidth(1.0)

# Ticks inside
ax.tick_params(direction='in', length=6, width=1.0, colors='black')

plt.title('Sample Graph')
plt.xlabel('x')
plt.ylabel('y')
plt.xticks(x)
plt.legend()
plt.tight_layout()

file_path = 'sample_graph_english.png'
plt.savefig(file_path, dpi=300)
plt.show()

file_path
