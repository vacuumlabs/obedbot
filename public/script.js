/* eslint-disable no-alert, no-unused-vars */
/* eslint-env browser */
function notifyOrdered(office, restaurant, arrived, el) {
  if (el.dataset.inProgress) return false
  if (!confirm('Are you sure?')) return false

  el.dataset.inProgress = true
  el.classList.add('disabled')

  fetch('/' + office + '/notify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      restaurant: restaurant,
      arrived: arrived,
    }),
  }).then(res => {
    el.dataset.inProgress = false
    el.classList.remove('disabled')

    if (!res.ok) {
      alert('Action failed :(')
    }
  })
}

function changeOffice(officeId) {
  location.href = '/' + officeId + '/'
}
