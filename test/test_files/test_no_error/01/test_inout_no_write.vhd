package test_inout_no_write is


end package;

package body test_inout_no_write is
  procedure dummy (
    foo : out boolean
    ) is
  begin
    foo := foo;
  end procedure;

  procedure dummy (
    foo : inout boolean
    ) is
  begin
    foo := foo;
  end procedure;

  procedure write (
    foo : inout boolean) is
  begin
    dummy(foo);
  end procedure write;

  procedure test  is
    constant a : boolean;
  begin
    dummy(a);
  end procedure test;

end package body;
