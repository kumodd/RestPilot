# Kitchen Manual

This manual provides instructions for Chefs and Kitchen Staff using the RestPilot Flutter tablet application.

## 1. Getting Started
* Log in to the Kitchen tablet using your credentials.
* The application is optimized for tablet use and provides a real-time order queue.

## 2. Order Queue
* **Incoming Orders**: When a waiter confirms an order, it immediately appears in the **New Orders** queue with an alert sound.
* **Order Details**: Each order card displays the table number, order number, list of items, quantities, and any special instructions (e.g., "Less spicy").
* **Priority**: Pay attention to any priority indicators or wait times.

## 3. Processing Orders
1. **Accept Order**: Tap **Accept** to acknowledge the order and move it to the **Preparing** column. This updates the status for the waiter and customer.
2. **Item Status**: (Optional depending on restaurant setup) You can mark individual items as ready as they are finished.
3. **Mark Ready**: Once the entire order is prepared and plated, tap **Mark Ready**.
   * This sends an instant notification to the waiter to pick up the food.
   * The order moves to the **Ready** column.

## 4. Special Scenarios
* **Modifications**: If a waiter modifies an order that is already being prepared, you will receive a highlighted alert.
* **Out of Stock**: If an item cannot be prepared, use the app to mark the item as out-of-stock and reject the item (where authorized), which instantly notifies the waiter and manager.
