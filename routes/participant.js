var express = require("express");
var router = express.Router();
require("dotenv").config();
const adminAuth = require("../middleware"); // Adjust the path if necessary
const CyclicDB = require("@cyclic.sh/dynamodb");
const db = CyclicDB(process.env.CYCLIC_DB);
let participants = db.collection("Participants");

// Utility function to validate email
function validateEmail(email) {
  const re =
    /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@(([^<>()[\]\\.,;:\s@"]+\.)+[^<>()[\]\\.,;:\s@"]{2,})$/i;
  return re.test(String(email).toLowerCase());
}

// Utility function to validate DOB format
function validateDOB(dob) {
  const re = /^\d{4}\/\d{2}\/\d{2}$/;
  return re.test(String(dob));
}

router.post("/add", adminAuth, async (req, res) => {
  const { email, firstname, lastname, dob, active, work, home } = req.body;

  // Validate required fields are present
  if (
    !email ||
    !firstname ||
    !lastname ||
    !dob ||
    active === undefined ||
    !work ||
    !home
  ) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Validate email format
  if (!validateEmail(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  // Validate DOB format
  if (!validateDOB(dob)) {
    return res
      .status(400)
      .json({ error: "Invalid DOB format, expected YYYY/MM/DD" });
  }

  try {
    await participants.set(email, {
      firstname,
      lastname,
      dob,
      active,
      work,
      home,
    });
    res.json({ message: "Participant added successfully" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      error: "Failed to add participant to the database",
      details: error.toString(),
    });
  }
});

router.get("/", adminAuth, async (req, res) => {
  const params = {
    TableName: "Participants",
    Item: {
      email,
      firstname,
      lastname,
      dob,
      active,
      work,
      home,
    },
  };

  try {
    const data = await dynamoDB.scan(params).promise();
    res.json(data.Items);
  } catch (error) {
    console.error("Error retrieving participants from DynamoDB:", error);
    res.status(500).json({ error: "Failed to retrieve participants" });
  }
});

router.get("/details", adminAuth, async (req, res) => {
  const params = {
    TableName: "Participant", // Replace with your actual table name
    ProjectionExpression: "firstname, lastname, email", // Specify the attributes you want to get
    FilterExpression: "active = :activeVal",
    ExpressionAttributeValues: {
      ":activeVal": true, // Assuming 'active' is a boolean attribute
    },
  };

  try {
    const data = await dynamoDB.scan(params).promise();
    // Only return the items array which contains the participant details
    res.json(data.Items);
  } catch (error) {
    console.error("Error retrieving active participants:", error);
    res.status(500).json({ error: "Failed to retrieve active participants" });
  }
});

router.get("/details/deleted", adminAuth, async (req, res) => {
  const params = {
    TableName: "Participants", // Replace with your actual table name
    ProjectionExpression: "firstname, lastname, email", // Specify the attributes you want to get
    FilterExpression: "active = :activeVal",
    ExpressionAttributeValues: {
      ":activeVal": false, // Assuming 'active' is a boolean attribute indicating deletion when false
    },
  };

  try {
    const data = await dynamoDB.scan(params).promise();
    // Only return the items array which contains the participant details
    res.json(data.Items);
  } catch (error) {
    console.error("Error retrieving deleted participants:", error);
    res.status(500).json({ error: "Failed to retrieve deleted participants" });
  }
});

router.get("/details/:email", adminAuth, async (req, res) => {
  const email = req.params.email;

  const params = {
    TableName: "Participants", // Replace with your actual table name
    KeyConditionExpression: "email = :emailVal",
    FilterExpression: "active = :activeVal",
    ExpressionAttributeValues: {
      ":emailVal": email,
      ":activeVal": true, // Assuming 'active' is a boolean attribute indicating if the participant is not deleted
    },
  };

  try {
    // Using query instead of get to allow for filtering by 'active' status
    const data = await dynamoDB.query(params).promise();
    if (data.Items.length > 0) {
      // Assuming email is unique, there should only be one item
      res.json(data.Items[0]);
    } else {
      res.status(404).json({ error: "Participant not found or is deleted" });
    }
  } catch (error) {
    console.error("Error retrieving participant details:", error);
    res.status(500).json({ error: "Failed to retrieve participant details" });
  }
});

router.get("/work/:email", adminAuth, async (req, res) => {
  const email = req.params.email;

  const params = {
    TableName: "Participants", // Replace with your actual table name
    KeyConditionExpression: "email = :emailVal",
    ProjectionExpression: "work.companyname, work.salary, work.currency",
    FilterExpression: "active = :activeVal",
    ExpressionAttributeValues: {
      ":emailVal": email,
      ":activeVal": true, // Assuming 'active' is a boolean attribute indicating if the participant is not deleted
    },
  };

  try {
    const data = await dynamoDB.query(params).promise();
    if (data.Items.length > 0) {
      // Assuming email is unique, there should only be one matching item
      res.json(data.Items[0].work); // Return only the work details
    } else {
      res.status(404).json({ error: "Participant not found or is deleted" });
    }
  } catch (error) {
    console.error("Error retrieving participant's work details:", error);
    res.status(500).json({ error: "Failed to retrieve work details" });
  }
});

router.get("/home/:email", adminAuth, async (req, res) => {
  const email = req.params.email;

  const params = {
    TableName: "Participants", // Replace with your actual table name
    KeyConditionExpression: "email = :emailVal",
    ProjectionExpression: "home.country, home.city",
    FilterExpression: "active = :activeVal",
    ExpressionAttributeValues: {
      ":emailVal": email,
      ":activeVal": true, // Assuming 'active' is a boolean attribute indicating if the participant is not deleted
    },
  };

  try {
    const data = await dynamoDB.query(params).promise();
    if (data.Items.length > 0) {
      // Assuming email is unique, there should only be one matching item
      res.json(data.Items[0].home); // Return only the home details
    } else {
      res.status(404).json({ error: "Participant not found or is deleted" });
    }
  } catch (error) {
    console.error("Error retrieving participant's home details:", error);
    res.status(500).json({ error: "Failed to retrieve home details" });
  }
});

router.delete("/participants/:email", adminAuth, async (req, res) => {
  const email = req.params.email;

  const params = {
    TableName: "Participants", // Replace with your actual table name
    Key: {
      email: email,
    },
    UpdateExpression: "set active = :val",
    ExpressionAttributeValues: {
      ":val": 0, // Or false, depending on how the 'active' attribute is defined in your table
    },
    ReturnValues: "UPDATED_NEW",
  };

  try {
    const data = await dynamoDB.update(params).promise();
    res.json({
      message: "Participant successfully deleted",
      updatedAttributes: data.Attributes,
    });
  } catch (error) {
    console.error("Error deleting participant:", error);
    res.status(500).json({ error: "Failed to delete participant" });
  }
});

router.put("/participants/:email", adminAuth, async (req, res) => {
  const email = req.params.email;
  const { firstname, lastname, dob, active, work, home } = req.body;

  // Validation for required fields and formats (similar to the POST /participants/add)
  if (
    !firstname ||
    !lastname ||
    !dob ||
    active === undefined ||
    !work ||
    !home
  ) {
    return res
      .status(400)
      .json({ error: "Missing required fields or invalid data format" });
  }

  // Additional format validations (e.g., for email and dob) can be done here as well

  const params = {
    TableName: "Participants", // Replace with your actual table name
    Key: {
      email: email,
    },
    UpdateExpression:
      "set firstname = :fn, lastname = :ln, dob = :dob, active = :active, work = :work, home = :home",
    ExpressionAttributeValues: {
      ":fn": firstname,
      ":ln": lastname,
      ":dob": dob,
      ":active": active,
      ":work": work,
      ":home": home,
    },
    ReturnValues: "ALL_NEW",
  };

  try {
    const data = await dynamoDB.update(params).promise();
    res.json({
      message: "Participant updated successfully",
      updatedAttributes: data.Attributes,
    });
  } catch (error) {
    console.error("Error updating participant:", error);
    res.status(500).json({ error: "Failed to update participant" });
  }
});

module.exports = router;
