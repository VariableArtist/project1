const AWS = require('aws-sdk');

AWS.config.update({
    region: 'us-east-1'
});

const docClient = new AWS.DynamoDB.DocumentClient();

// getAllUsers().then((data) => { console.log(data) }).catch((err) => (console.log(err)));

function getAllUsers() {
    const params = {
        TableName: 'users'
    }

    return docClient.scan(params).promise();
}

// getUsersWithUserName("user1").then((data) => { console.log(data) }).catch((err) => (console.log(err)));

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

// getUsersWithUserNameSI("user1").then((data) => { console.log(data) }).catch((err) => (console.log(err)));

function getUsersWithUserNameSI(username) {
    const params = {
        TableName: 'users',
        IndexName: "username-index",
        KeyConditionExpression: '#c = :value',
        ExpressionAttributeNames: {
            '#c': 'username'
        },
        ExpressionAttributeValues: {
            ':value': username
        }
    }

    return docClient.query(params).promise();
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
        TableName: 'tickets_pending',
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

// getTicketWithID("01cdb5ef-6f82-4fb2-a1f3-427ec58ad6a2").then((data) => { console.log(data); }).catch((err) => { console.log(err); });

function getTicketWithID(ticket_id) {
    const params = {
        TableName: 'tickets_pending',
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

// getTicketsByUserNameSI("user19").then((data) => { console.log(data) }).catch((err) => (console.log(err)));

function getTicketsByUserNameSI(username) {
    const params = {
        TableName: 'tickets_previous',
        IndexName: "username-index",
        KeyConditionExpression: '#c = :value',
        ExpressionAttributeNames: {
            '#c': 'username'
        },
        ExpressionAttributeValues: {
            ':value': username
        }
    }

    return docClient.query(params).promise();
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

// getPreviousTicketsWithUsernameAndTypeSI("user4", "Japanese").then((data) => { console.log(data); }).catch((err) => { console.log(err); });

function getPreviousTicketsWithUsernameAndTypeSI(username, type) {
    const params = {
        TableName: 'tickets_previous',
        IndexName: "username-index",
        KeyConditionExpression: '#c = :value',
        FilterExpression: '#p = :value2',
        ExpressionAttributeNames: {
            '#c': 'username',
            '#p': 'type'
        },
        ExpressionAttributeValues: {
            ':value': username,
            ':value2': type
        },
    }

    return docClient.query(params).promise();
}

// getAllTickets().then((data) => { console.log(data); }).catch((err) => { console.log(err); });

function getAllTickets() {
    const params = {
        TableName: 'tickets_pending'
    }

    return docClient.scan(params).promise();
}

function getAllTicketsFromTable(nameOfTable) {
    const params = {
        TableName: nameOfTable
    }

    return docClient.scan(params).promise();
}

// getTicketsWithID("01cdb5ef-6f82-4fb2-a1f3-427ec58ad6a2").then((data) => { console.log(data); }).catch((err) => { console.log(err); });

function getTicketsWithID(ticket_id) {
    const params = {
        TableName: 'tickets_pending',
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

// getTicketsWithIdQuery("01cdb5ef-6f82-4fb2-a1f3-427ec58ad6a2").then((data) => { console.log(data); }).catch((err) => { console.log(err); });

function getTicketsWithIdQuery(ticket_id) {
    const params = {
        TableName: 'tickets_pending',
        KeyConditionExpression: '#c = :value',
        ExpressionAttributeNames: {
            '#c': 'ticket_id',
        },
        ExpressionAttributeValues: {
            ':value': ticket_id,
        },
    }

    return docClient.query(params).promise();
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
        TableName: 'tickets_pending',
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
    getUsersWithUserNameSI,
    registerNewUser,
    getUsersWithUsernameAndPassword,
    addNewTicket,
    getTicketWithID,
    moveTicketToTable,
    getTicketsWithUsername,
    getTicketsByUserNameSI,
    getPreviousTicketsWithUsernameAndType,
    getPreviousTicketsWithUsernameAndTypeSI,
    getAllTickets,
    getAllTicketsFromTable,
    getTicketsWithID,
    getTicketsWithIdQuery,
    deleteTicketByIdInTable,
    deleteTicketById,
    updateUserRole
};