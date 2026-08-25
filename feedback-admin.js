import { supabase } from "./supabase.js";

const JOBPILOT_ADMIN_ID =
  "9a89bdf0-1f17-48ec-a622-db59545e8ada";


export async function showFeedbackAdmin() {

  const {
    data: {
      user
    }
  } = await supabase.auth.getUser();


  if (
    !user ||
    String(user.id) !== JOBPILOT_ADMIN_ID
  ) {

    alert("You do not have permission to view feedback.");

    return;

  }


  const pageContent =
    document.getElementById("pageContent");

  if (!pageContent) return;


  pageContent.innerHTML = `

    <div class="page-header">

      <div>
        <h2>🐛 Beta Feedback</h2>

        <p>
          Bug reports, feature requests and feedback from JobPilot users.
        </p>
      </div>

    </div>


    <div id="feedbackAdminList">

      <p>Loading feedback...</p>

    </div>

  `;


  await loadAdminFeedback();

}


async function loadAdminFeedback() {

  const container =
    document.getElementById(
      "feedbackAdminList"
    );

  if (!container) return;


  const {
    data,
    error
  } =
    await supabase
      .from("feedback")
      .select("*")
      .order(
        "created_at",
        {
          ascending: false
        }
      );


  if (error) {

    container.innerHTML = `

      <div class="panel">

        <h3>Could not load feedback</h3>

        <p>
          ${escapeFeedbackHtml(error.message)}
        </p>

      </div>

    `;

    return;

  }


  if (!data || data.length === 0) {

    container.innerHTML = `

      <div class="panel">

        <h3>No feedback yet</h3>

        <p>
          Beta feedback will appear here when users submit it.
        </p>

      </div>

    `;

    return;

  }


  container.innerHTML = data.map(item => {

    const typeLabel =
      item.type === "bug"
        ? "🐛 Bug"
        : item.type === "feature"
          ? "💡 Feature"
          : "💬 General";


    const priorityLabel =
      String(item.priority || "medium")
        .toUpperCase();


    const date =
      item.created_at
        ? new Date(
            item.created_at
          ).toLocaleString()
        : "";


    return `

      <div
        class="panel"
        style="margin-bottom:16px;"
      >

        <div
          style="
            display:flex;
            justify-content:space-between;
            gap:16px;
            align-items:flex-start;
            flex-wrap:wrap;
          "
        >

          <div>

            <h3>
              ${escapeFeedbackHtml(item.subject)}
            </h3>

            <p>

              ${typeLabel}

              &nbsp; • &nbsp;

              <strong>
                ${priorityLabel}
              </strong>

              &nbsp; • &nbsp;

              ${escapeFeedbackHtml(date)}

            </p>

          </div>


          <select
            class="feedback-status"
            data-feedback-id="${item.id}"
          >

            <option
              value="open"
              ${item.status === "open" ? "selected" : ""}
            >
              Open
            </option>

            <option
              value="in_progress"
              ${item.status === "in_progress" ? "selected" : ""}
            >
              In Progress
            </option>

            <option
              value="resolved"
              ${item.status === "resolved" ? "selected" : ""}
            >
              Resolved
            </option>

            <option
              value="closed"
              ${item.status === "closed" ? "selected" : ""}
            >
              Closed
            </option>

          </select>

        </div>


        <div
          style="
            margin-top:12px;
            white-space:pre-wrap;
          "
        >
          ${escapeFeedbackHtml(item.message)}
        </div>


        <hr>


        <small>

          User ID:
          ${escapeFeedbackHtml(item.user_id)}

          <br>

          Page:
          ${escapeFeedbackHtml(item.page || "Unknown")}

        </small>

      </div>

    `;

  }).join("");


  container
    .querySelectorAll(".feedback-status")
    .forEach(select => {

      select.addEventListener(
        "change",
        async () => {

          await updateFeedbackStatus(
            select.dataset.feedbackId,
            select.value
          );

        }
      );

    });

}


async function updateFeedbackStatus(
  feedbackId,
  status
) {

  const {
    error
  } =
    await supabase
      .from("feedback")
      .update({
        status: status
      })
      .eq(
        "id",
        feedbackId
      );


  if (error) {

    alert(
      "Could not update feedback:\n\n" +
      error.message
    );

    await loadAdminFeedback();

    return;

  }

}


function escapeFeedbackHtml(value) {

  return String(value ?? "")
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

}
