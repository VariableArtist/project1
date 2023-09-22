const AWS = require('aws-sdk');

AWS.config.update({
    region: 'us-east-1'
});

const docClient = new AWS.DynamoDB.DocumentClient();


function getAllUsers() {
    const params = {
        TableName: 'users'
    }

    return docClient.scan(params).promise();
}

function getUsersWithUserName(username) {
    const params = {
        TableName: 'users',
        FilterExpression: '#c = :value',
        ExpressionAttributeNames: {
            '#c': 'username'
        },
        ExpressionAttributeValues: {
            ':value': username
        },
    }

    return docClient.scan(params).promise();
}

// getUsersWithPassword("pass1").then((data) => { console.log(data); }).catch((err) => { console.log(err); });

function getUsersWithPassword(password) {
    const params = {
        TableName: 'users',
        FilterExpression: '#c = :value',
        ExpressionAttributeNames: {
            '#c': 'password'
        },
        ExpressionAttributeValues: {
            ':value': password
        },
    }

    return docClient.scan(params).promise();
}

function registerNewUser(user_id, username, password) {
    const params = {
        TableName: 'users',
        Item: {
            username,
            password,
            role: 'employee',
            user_id
        }
    }

    return docClient.put(params).promise();
}

// getUsersWithUsernameAndPassword("user1", "pass1").then((data) => { console.log(data); }).catch((err) => { console.log(err); });

function getUsersWithUsernameAndPassword(username, password) {
    const params = {
        TableName: 'users',
        FilterExpression: '#c = :value AND #p = :value2',
        ExpressionAttributeNames: {
            '#c': 'username',
            '#p': 'password'

        },
        ExpressionAttributeValues: {
            ':value': username,
            ':value2': password
        },
        limit: 1
    }

    return docClient.scan(params).promise();
}

// addNewTicket(uuid.v4(), 50.0, "none").then((data) => { console.log(data); }).catch((err) => { console.log(err); });

function addNewTicket(ticket_id, amount, description, username, type) {
    const params = {
        TableName: 'tickets',
        Item: {
            ticket_id,
            amount,
            description,
            status: 'pending',
            date: new Date().toLocaleDateString(),
            username: username,
            type: type,
        },
    }

    return docClient.put(params).promise();
}

// getTicketByID("53905e0f-2030-4110-bfb8-09a41d237fe1").then((data) => { console.log(data); }).catch((err) => { console.log(err); });

function getTicketByID(ticket_id) {
    const params = {
        TableName: 'tickets',
        Key: {
            ticket_id
        }
    }

    return docClient.get(params).promise();
}

// testItem = {
//     ticket_id: uuid.v4(),
//     amount: 0.00,
//     description: "nada",
//     status: 'Approved',
//     date: new Date().toLocaleDateString()
// }

// moveTicketToTable('tickets_previous', testItem)
//     .then((data) => { console.log(data); })
//     .catch((err) => { console.log(err); });

function moveTicketToTable(nameOfTable, itemToAdd) {
    const params = {
        TableName: nameOfTable,
        Item: itemToAdd
    }

    return docClient.put(params).promise();
}

function getTicketsWithUsername(username) {
    const params = {
        TableName: 'tickets_previous',
        FilterExpression: '#c = :value',
        ExpressionAttributeNames: {
            '#c': 'username'
        },
        ExpressionAttributeValues: {
            ':value': username,
        },
    }

    return docClient.scan(params).promise();
}

// getPreviousTicketsWithUsernameAndType("user2", "food").then((data) => { console.log(data); }).catch((err) => { console.log(err); });

function getPreviousTicketsWithUsernameAndType(username, type) {
    const params = {
        TableName: 'tickets_previous',
        FilterExpression: '#c = :value AND #p = :value2',
        ExpressionAttributeNames: {
            '#c': 'username',
            '#p': 'type'

        },
        ExpressionAttributeValues: {
            ':value': username,
            ':value2': type
        },
    }

    return docClient.scan(params).promise();
}

// getAllTickets().then((data) => { console.log(data); }).catch((err) => { console.log(err); });

function getAllTickets() {
    const params = {
        TableName: 'tickets'
    }

    return docClient.scan(params).promise();
}

function getAllTicketsFromTable(nameOfTable) {
    const params = {
        TableName: nameOfTable
    }

    return docClient.scan(params).promise();
}

// getTicketsWithID("1e2854ea-7603-4467-a12f-9740d6d2a2c5").then((data) => { console.log(data); }).catch((err) => { console.log(err); });

function getTicketsWithID(ticket_id) {
    const params = {
        TableName: 'tickets',
        FilterExpression: '#c = :value',
        ExpressionAttributeNames: {
            '#c': 'ticket_id'
        },
        ExpressionAttributeValues: {
            ':value': ticket_id,
        },
        limit: 1
    }

    return docClient.scan(params).promise();
}

function deleteTicketByIdInTable(nameOfTable, ticket_id) {
    const params = {
        TableName: nameOfTable,
        Key: {
            ticket_id
        }
    }

    return docClient.delete(params).promise();
}

// deleteTicketById("53905e0f-2030-4110-bfb8-09a41d237fe1").then((data) => { console.log("ItemDelete"); }).catch((err) => { console.log(err); });

function deleteTicketById(ticket_id) {
    const params = {
        TableName: 'tickets',
        Key: {
            ticket_id
        }
    }

    return docClient.delete(params).promise();
}

// updateUserRole("a318eab6-1932-4bb5-b036-1390932b7086", "manager").then((data) => { console.log(data); }).catch((err) => { console.log(err); });

function updateUserRole(user_id, newRole) {
    const params = {
        TableName: 'users',
        Key: {
            user_id
        },
        UpdateExpression: 'set #n = :value',
        ExpressionAttributeNames: {
            '#n': 'role'
        },
        ExpressionAttributeValues: {
            ':value': newRole
        }
    }

    return docClient.update(params).promise();
}

module.exports = {
    getAllUsers,
    getUsersWithUserName,
    registerNewUser,
    getUsersWithUsernameAndPassword,
    addNewTicket,
    getTicketByID,
    moveTicketToTable,
    getTicketsWithUsername,
    getPreviousTicketsWithUsernameAndType,
    getAllTickets,
    getAllTicketsFromTable,
    getTicketsWithID,
    deleteTicketByIdInTable,
    deleteTicketById,
    updateUserRole
};