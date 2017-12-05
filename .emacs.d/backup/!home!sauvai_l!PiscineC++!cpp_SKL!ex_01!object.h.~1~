#ifndef CLASS_H
# define CLASS_H

#include <sys/types.h>

typedef void Object;

typedef struct {
    const size_t __size__;
    const char* __name__;
    void (*__init__)(Object* self);
    void (*__del__)(Object* self);
} Class;

#endif
