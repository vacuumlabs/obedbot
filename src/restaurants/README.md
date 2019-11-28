# Configuration of restaurants

Each restaurant has export object as default export with these keys:

- `id` - restaurant ID, should be unique
- `name` - restaurant name
- `endOfOrders` - object defining time of end of orders `{ hour: <number>, minute: <number> }` or `null`
- `isNotifiable` - whether kitchen ninja can send notification about arrived/not arrived food
- `isOrder` - function that checks, whether message is order for this restaurant or not
- `getMenuLink` (optional) - function that returns link to current menu
- `getMenu` (optional) - function that returns actual menu
- `help` - text of help
- `getOrdersCounter` - function that returns new orders counter - object with two methods: `add(text)` and `view()`
    - `add(text)` - if `text` represents valid order, function stores order details and return `true`, otherwise returns `false`
    - `view()` - function returns HTML with actual status of ordered food
