# Search Product Price

Додаток для пошуку та перегляду цін на товари, побудований на React + Vite.

## Документація користувача

### Позначення в таблиці

- 🔴 **Червоний колір** — відсутність товару (0 наявності)
- ⚪ **Сірий колір** — застарілий або неактуальний товар

### Перегляд деталей товару

Для перегляду детальної інформації про товар натисніть на відповідний рядок у таблиці.

### Пояснення полів ціни

- **Ціна** — поточна роздрібна ціна товару
- **Ціна А** — акційна ціна товару
- **Ціна Г** — гуртова (оптова) ціна товару
- **Ціна (x%)** — ціна товару зі знижкою, де x — відсоток знижки, обраний на сторінці з таблицею товарів

### Робота з прихованими значеннями

- Для перегляду заблюрених (прихованих) значень натисніть на них (наприклад, Ціна Г)
- Щоб повернути блюр (приховати) значення, натисніть ще раз на те саме поле

## Технічна інформація

### React + Vite Setup

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

### Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
