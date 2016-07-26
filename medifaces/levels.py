__author__ = 'isparks'

def make_levels():
    """The algorithm used to make the points/levels"""
    i = 5
    level = 1
    while i < 4000:
        print "%d = %d" % (i, level,)  #Points = level
        level += 1
        i = i * 1.425

#1-20 levels. If your points < the value you are the previous level.
levels = [
    (0, 1, 'Newbie'),
    (15, 2, 'Beginner'),
    (21, 3, 'Smiler'),
    (30, 4, 'Greeter'),
    (42, 5, 'Befriender'),
    (60, 6, 'Hobnobber'),
    (87, 7, 'Mingler'),
    (123, 8, 'Coordinator'),
    (177, 9, 'Socializer'),
    (255, 10, 'Namedropper'),
    (363, 11, 'Networker'),
    (516, 12, 'Connector'),
    (735, 13, 'Schmoozer'),
    (1050, 14, 'AWESOME'),
    (1497, 15, 'Chillaxer'),
    (2133, 16, 'World Class'),
    (3042, 17, 'Diplomat'),
    (4335, 18, 'Dude!'),
    (6177, 19, 'Salesperson'),
    (8805, 20, 'Legend'),
    (150000, 21, 'All Knowing'),
]

DEFAULT_LEVEL_NAME = levels[0][2]

def getLevelInfo(points):
    """Takes an integer for the number of points a user has and returns the
    corresponding level number, name, and progress towards the next level.
    """

    i = 0
    while levels[i+1][0] <= points:
        i += 1
    levelNum, levelName = levels[i][1:]

    thisLevelPts = levels[i][0]
    nextLevelPts = levels[i+1][0]
    progress = int(100.0 * (points - thisLevelPts) / (nextLevelPts - thisLevelPts))

    return levelNum, levelName, progress


if __name__ == '__main__':
    print getLevelInfo(350)
