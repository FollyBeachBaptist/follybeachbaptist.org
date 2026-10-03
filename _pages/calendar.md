---
title: "Calendar Scroll"
permalink: /calendar/
author: default
header:
  og_image: /assets/images/preview.jpg
---

[View the Monthly Calendar]({{ '/monthly-calendar/' | relative_url }})

 All Bible Study groups meet in the Education Building.

{% for event in site.data.calendar %}
<article class="calendar-scroll-event">
  <h2>{{ event.title | escape }}</h2>
  <p><strong>Date:</strong> {{ event.date | date: "%B %-d, %Y" }}{% if event.end_date %} – {{ event.end_date | date: "%B %-d, %Y" }}{% endif %}<br>
  <strong>Time:</strong> {{ event.time | escape }}{% if event.repeats %}<br><strong>Repeats:</strong> {{ event.repeats | escape }} through {{ event.through | date: "%B %-d, %Y" }}{% endif %}{% if event.status %}<br><strong>Status:</strong> {{ event.status | escape }}{% endif %}</p>
  {% if event.slide %}<img src="{{ event.slide | escape }}" alt="{{ event.title | escape }} announcement" loading="lazy" style="width:100%;height:auto">{% endif %}
</article>
<hr>
{% endfor %}
