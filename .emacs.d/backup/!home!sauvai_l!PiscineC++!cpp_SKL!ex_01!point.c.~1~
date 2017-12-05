#include <stdio.h>
#include "point.h"

typedef struct
{
    Class base;
    int x, y;
} PointClass;

static void Point_ctor(Object* self)
{
    (void) self;
    printf("Point()\n");
}

static void Point_dtor(Object* self)
{
    (void) self;
    printf("~Point()\n");
}

static PointClass _description = {
    { sizeof(PointClass), "Point", &Point_ctor, &Point_dtor },
    0, 0
};

Class* Point = (Class*) &_description;
