export const initScrollObserver = (
  containerId: string,
  notificationId: string,
): void => {
  const container = document.getElementById(containerId)
  const notification = document.getElementById(notificationId)

  if (!container || !notification) {
    console.warn('Elements not found')
    return
  }

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Container is visible, show notification
          notification.dataset.hidden = 'false'

          // Hide after delay
          setTimeout(() => {
            notification.dataset.hidden = 'true'
          }, 3500)

          // Stop observing
          observer.unobserve(container)
        }
      })
    },
    {
      threshold: 0.1, // Trigger when 20% of the element is visible
    },
  )

  // Start observing the container
  observer.observe(container)
}
