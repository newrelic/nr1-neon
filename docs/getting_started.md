# About Neon

Neon is an application that allows you to create a status visualization at a glance. Neon can be scaled to track the health of entire business units or regions. Statuses are derived from existing New Relic alert policies or from values from New Relic events. Neon makes it easy to configure the
visualization to show exactly what you need to see.

# Dependencies

To use Neon to monitor your alerts, you need to have New Relic Alerts and a webhook notification channel set up. Instructions
for webhook setup is ![here.](https://github.com/newrelic/nr1-neon/blob/main/docs/alert_webhook_config.md)

Using Neon to monitor your events require that you know the attributes you'd like to keep track of. Learn more about attributes ![here](https://docs.newrelic.com/docs/using-new-relic/welcome-new-relic/get-started/glossary#attribute)

# Create A New Board

In your New Relic One account, click on the Neon icon ![Screenshot #1](.../.../catalog/screenshots/nr1-neon-logo.png)
in the Applications section.

Close the Welcome screen and click the plus icon (+) to create your first board.

![Screenshot #2](.../.../catalog/screenshots/nr1-neon-home.png)

In the modal window, type in your board title in the BOARD NAME text field.

Using the Event dropdown, select the New Relic event that you would like to display in your board. Events that appearin the dropdown are dependent on what you have in your account. For example, if you are using APM, you will see events such as Metric, Transaction, TransactionError, etc ...

Click the + Add button.

You will then see your new board in the Neon home page.

# Setup Board

To monitor the status of a **New Relic alert** make sure you've set up a ![webhook notification channel.](https://github.com/newrelic/nr1-neon/blob/main/docs/alert_webhook_config.md)

Then perform the following steps:

1.  From the Neon home page, click on the board that you'd like to setup.
2.  You will see a row of options underneath your board title. Click on setup board.
3.  A modal window opens with a title of **Board Details**. Click on the Rows tab and type in a title in the **Title** text field.
4.  Click the + Add button. Your row title is now displayed on the board. Repeat the same step to add more row titles.
5.  Click on the column tab and type in your column name in the **Title** text field. Click on the + Add button. Repeat the same step to add more column titles.
6.  Click on the Cells tab, using the **SELECT A ROW** and **SELECT A COLUMN** dropdowns, select the Row and Column titles.
7.  Click on the **SELECT DATA TYPE** dropdown and select **New Relic Alert**. In the Alert Policy text field, enter the webhook policy name _exactly_ as you've named it in New Relic Alerts.
8.  Click the + Add button to finish the board setup.
9.  Click outside the modal or the X icon to close the modal.

To monitor the status of the **New Relic event** that you chose when you created a new board such as when an
attribute like average(duration) exceeded a certain value repeat steps 1 to 5 from the alert setup.

- For step 6 select New Relic Attribute
- In the Attribute Name text field, type in the attribute name like duration. Optionally you can prepend the attribute with an aggregator function such as average(duration).
- Click on the COMPARISON dropdown and select less than, equals, or greater than.
- In the Value text field, type in the value that you'd like Neon to monitor.
- For example, Neon can inform you when the average duration of a Page View event exceeds 1 second. Set up Neon using the average(duration) attribute name, with a COMPARISON of greater than, and a value of 1. When this event occurs, Neon will display that actual number that exceeded 1 in red.
- You may need to refresh the screen to see the changes take place.

# View Boards

While looking at an individual board, clicking on view boards will take you back to the Neon home page where all your boards are displayed.

# Edit Board

- To edit your row and/or column titles, go to the board that you'd like to edit and click on edit board.
- Click on the row or column tab and click on the edit button to edit the row or column title
- Type in the new row or column name and click the save button.
- To edit the cells and use the new row and/or column titles, click on cells tab then click the edit button. Use the row and/or column drop down to associate the new row and/or column title to the attribute or alert. You also have the option of changing the attributes.
- Click the cancel button to cancel editing.
- Click the delete button to delete the row or column title.
- Click the X icon in the upper right corner or anywhere outside the modal to exit edit mode.

# Delete Board

While viewing an individual board, click on delete board to completely get rid of a board.
