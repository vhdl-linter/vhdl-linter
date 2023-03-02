package multiple_definition_record is
end package;

package body multiple_definition_record is
  type ListType is record
    elem : integer;
  end record;

  procedure test is
    variable x, y : ListType;
  begin
    x.elem := y.elem;
  end procedure test;
end package body;
