package body pkg is
  type ListType is record
    elem : integer;
  end record;
  variable x, y : ListType;

  procedure test is
  begin
    x.elem <= y.elem;
  end procedure test;
end package body;
