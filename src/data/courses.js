import promptEngineering from './promptEngineering';
import aiSecurity from './aiSecurity';
import aiMarketing from './aiMarketing';
import aiSeoGeo from './aiSeoGeo';

export const courses = [promptEngineering, aiSecurity, aiMarketing, aiSeoGeo];

export function getCourse(id) {
  return courses.find(c => c.id === id);
}

export function allLessons(course) {
  return course.modules.flatMap(m => m.lessons.map(l => ({ ...l, moduleId: m.id, moduleTitle: m.title })));
}

export function totalMinutes(course) {
  return allLessons(course).reduce((a, l) => a + (l.minutes || 0), 0);
}

const STATIC_BLOCKS = new Set(['text', 'heading', 'list', 'callout', 'code']);

export function isActivity(block) {
  return !STATIC_BLOCKS.has(block.type);
}

export function activityCount(lesson) {
  return lesson.blocks.filter(isActivity).length;
}
